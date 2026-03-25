import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeProduct, NutritionData } from './utils/analysisEngine';
import { parseNutritionOCR } from './utils/ocrParser';

admin.initializeApp();
const db = admin.firestore();

// AI Setup
const ai = new GoogleGenerativeAI('AIzaSyAdekDS869fxsrEqPdC7oKKh6OXvhRsFjU');

export const onScanProduct = functions.https.onCall(async (request: any) => {
  const { barcode } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

  // 1. Check cache
  const docRef = db.collection('products').doc(barcode);
  const docSnap = await docRef.get();
  
  // Track scan count
  await incrementUserScanCount(uid);

  if (docSnap.exists) {
    return docSnap.data();
  }

  // 2. Open Food Facts Lookup
  try {
    const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const offData = await offResponse.json();

    if (offData.status === 1) {
      const p = offData.product;
      const nutriments = p.nutriments || {};
      
      const nutritionObj: NutritionData = {
        energyKcal: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'],
        totalSugarsG: nutriments['sugars_100g'] || nutriments['sugars'],
        totalFatG: nutriments['fat_100g'] || nutriments['fat'],
        saturatedFatG: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'],
        sodiumMg: nutriments['sodium_100g'] ? nutriments['sodium_100g'] * 1000 : undefined,
        proteinG: nutriments['proteins_100g'] || nutriments['proteins'],
        carbohydratesG: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'],
        ingredientsList: p.ingredients_text || '',
      };

      const analysis = analyzeProduct(nutritionObj);

      const productRecord = {
        barcode,
        productName: p.product_name || 'Unknown Product',
        brand: p.brands || 'Unknown Brand',
        imageUrl: p.image_url || null,
        nutriments: nutritionObj,
        ingredientsRaw: p.ingredients_text || '',
        ...analysis,
        dataSource: 'OpenFoodFacts',
        confidence: 100,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        scanCount: 1,
      };

      await docRef.set(productRecord);
      return productRecord;
    }
  } catch (error) {
    console.error("OFF API Error:", error);
  }

  return { found: false };
});


export const onOCRSubmit = functions.https.onCall({ timeoutSeconds: 60, memory: '512MiB' }, async (request: any) => {
  const { barcode, ocrText } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

  await incrementUserScanCount(uid);

  const { data, confidence } = parseNutritionOCR(ocrText);
  let finalData: NutritionData = { ingredientsList: '', ...data } as NutritionData;

  if (confidence < 80) {
    // Fallback to Gemini AI
    const prompt = `Extract standard nutrition data from this OCR text of a food label. Return ONLY a pure JSON object matching this schema:
    {
      "energyKcal": number (optional),
      "totalSugarsG": number (optional),
      "totalFatG": number (optional),
      "saturatedFatG": number (optional),
      "sodiumMg": number (optional),
      "proteinG": number (optional),
      "carbohydratesG": number (optional),
      "ingredientsList": string
    }
    
    OCR text:
    ${ocrText}`;

    try {
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const response = await model.generateContent(prompt);

      const aiText = response.response.text().replace(/```json|```/g, '').trim();
      const aiParsed = JSON.parse(aiText);
      finalData = { ...finalData, ...aiParsed };
    } catch (e) {
      console.error("AI Parse Error:", e);
    }
  }

  const analysis = analyzeProduct(finalData);

  const productRecord = {
    barcode,
    productName: 'Scanned Product',
    brand: 'Unknown',
    imageUrl: null,
    nutriments: finalData,
    ingredientsRaw: finalData.ingredientsList,
    ...analysis,
    dataSource: confidence < 80 ? 'AI' : 'OCR',
    confidence,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    scanCount: 1,
  };

  await db.collection('products').doc(barcode).set(productRecord);
  return productRecord;
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
