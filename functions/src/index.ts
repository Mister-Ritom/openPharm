import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { analyzeProduct, NutritionData } from './utils/analysisEngine';
import { parseNutritionOCR } from './utils/ocrParser';

admin.initializeApp();
const db = admin.firestore();

// AI Setup - In production, use defineSecret('GEMINI_API_KEY')
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAdekDS869fxsrEqPdC7oKKh6OXvhRsFjU';

async function getUserProfile(uid: string) {
  const userDoc = await db.collection('users').doc(uid).get();
  return userDoc.exists ? userDoc.data() : null;
}

export const onScanProduct = functions.https.onCall({ timeoutSeconds: 30 }, async (request) => {
  const { barcode } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

  await incrementUserScanCount(uid);

  // 1. Check cache
  const docRef = db.collection('products').doc(barcode);
  const docSnap = await docRef.get();
  
  const profile = await getUserProfile(uid);

  if (docSnap.exists) {
    const rawData = docSnap.data() as NutritionData;
    const analysis = analyzeProduct(rawData, profile);
    return { ...rawData, ...analysis, cached: true };
  }

  // 2. Open Food Facts Lookup
  try {
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const offData = await offResponse.json();

    if (offData.status === 1) {
      const p = offData.product;
      const nutriments = p.nutriments || {};
      
      const rawData: NutritionData = {
        name: p.product_name || 'Unknown Product',
        brand: p.brands || 'Unknown Brand',
        ingredients: p.ingredients_text?.split(',').map((s: string) => s.trim()) || [],
        nutrients: {
          energy_kcal: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
          protein_g: nutriments['proteins_100g'] || nutriments['proteins'] || 0,
          fat_g: nutriments['fat_100g'] || nutriments['fat'] || 0,
          sugar_g: nutriments['sugars_100g'] || nutriments['sugars'] || 0,
          sodium_mg: (nutriments['sodium_100g'] || 0) * 1000,
        },
        warnings: [] // Placeholder
      };

      const analysis = analyzeProduct(rawData, profile);

      const productRecord = {
        ...rawData,
        barcode,
        imageUrl: p.image_url || null,
        dataSource: 'OpenFoodFacts',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Save RAW metadata only (analysis is transient/tailored)
      await docRef.set(productRecord);
      
      return { ...productRecord, ...analysis };
    }
  } catch (error) {
    console.error("OFF API Error:", error);
  }

  return { found: false };
});

export const onOCRSubmit = functions.https.onCall({ timeoutSeconds: 60, memory: '512MiB' }, async (request) => {
  const { barcode, ocrText } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

  await incrementUserScanCount(uid);

  try {
    const rawData = await parseNutritionOCR(ocrText, GEMINI_API_KEY);
    const profile = await getUserProfile(uid);
    const analysis = analyzeProduct(rawData, profile);

    const productRecord = {
      barcode,
      ...rawData,
      dataSource: 'OCR+AI',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (barcode) {
      // Save RAW metadata
      await db.collection('products').doc(barcode).set(productRecord);
    }
    
    return { ...productRecord, ...analysis };
  } catch (e: any) {
    console.error("OCR Parse Error:", e);
    throw new functions.https.HttpsError('internal', 'Failed to parse nutrition label: ' + e.message);
  }
});

async function incrementUserScanCount(uid: string) {
  const todayStr = new Date().toISOString().split('T')[0];
  const usageRef = db.collection('users').doc(uid).collection('usage').doc('today');
  
  await db.runTransaction(async (t: any) => {
    const doc = await t.get(usageRef);
    if (!doc.exists) {
      t.set(usageRef, { date: todayStr, count: 1, lastScanAt: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      const data = doc.data();
      if (data?.date !== todayStr) {
        t.set(usageRef, { date: todayStr, count: 1, lastScanAt: admin.firestore.FieldValue.serverTimestamp() });
      } else {
        t.update(usageRef, { count: admin.firestore.FieldValue.increment(1), lastScanAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
  });
}

export const onRevenueCatWebhook = functions.https.onRequest(async (req: any, res: any) => {
  // Normally we would verify the webhook signature here
  const event = req.body?.event;
  if (!event) {
    res.status(400).send('No event found');
    return;
  }

  const rcUserId = event.app_user_id; // Maps to our Firebase UID ideally
  const eventType = event.type;
  
  try {
    const userRef = db.collection('users').doc(rcUserId);
    if (eventType === 'INITIAL_PURCHASE' || eventType === 'RENEWAL') {
      await userRef.collection('subscription').doc('current').set({
        status: 'active',
        plan: event.product_id,
        platform: event.store,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
      await userRef.collection('subscription').doc('current').set({
        status: 'free',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Webhook processing error', error);
    res.status(500).send('Internal Error');
  }
});

export const onUserDeleted = functions.auth.user().onDelete(async (user: any) => {
  const uid = user.uid;
  const userRef = db.collection('users').doc(uid);
  // Recursive delete or delete immediate subcollections: Note, in a real env, use firebase tools specialized function for recursive delete
  await userRef.delete();
  console.log(`Deleted user ${uid}`);
});

export const scheduledDailyReset = functions.scheduler.onSchedule('every day 00:00', async (event: any) => {
  // While scan count logic already lazily resets if the date doesn't match, 
  // we can use this to aggregate analytics.
  console.log('Daily reset running at', event.scheduleTime);
});

export const onProductFlagged = functions.firestore.onDocumentCreated('reports/{reportId}', async (event: any) => {
  const snap = event.data;
  if (!snap) return;
  const data = snap.data();
  const barcode = data.barcode;

  const reportsRef = db.collection('reports');
  const snapshot = await reportsRef.where('barcode', '==', barcode).count().get();
  
  if (snapshot.data().count >= 3) {
    await db.collection('products').doc(barcode).update({
      flaggedForReview: true
    });
    console.log(`Product ${barcode} flagged for review.`);
  }
});
