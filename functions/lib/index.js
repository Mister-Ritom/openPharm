"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProduct = exports.onProductFlagged = exports.scheduledDailyReset = exports.onUserDeleted = exports.onRevenueCatWebhook = exports.onOCRUpdate = exports.onOCRSubmit = exports.onScanProduct = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const functionsV1 = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const analysisEngine_1 = require("./utils/analysisEngine");
const ocrParser_1 = require("./utils/ocrParser");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
// Define secret object for Gemini API
const GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
async function getUserProfile(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists ? userDoc.data() : null;
}
/**
 * Checks if a nutriments object is effectively empty (all major macros are 0).
 * Used to flag products from Open Food Facts that exist but have no nutrition data.
 */
function isNutritionIncomplete(nutrients) {
    return ((nutrients.energy_kcal || 0) === 0 &&
        (nutrients.protein_g || 0) === 0 &&
        (nutrients.sugar_g || 0) === 0 &&
        (nutrients.fat_g || 0) === 0 &&
        (nutrients.carbohydrate_g || 0) === 0);
}
exports.onScanProduct = functions.https.onCall({
    timeoutSeconds: 30,
    secrets: [GEMINI_API_KEY]
}, async (request) => {
    const { barcode } = request.data;
    const uid = request.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    await incrementUserScanCount(uid);
    const profile = await getUserProfile(uid);
    // 1. Open Food Facts Lookup (As per USER preference: OFF FIRST)
    try {
        const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        const offData = await offResponse.json();
        if (offData.status === 1) {
            const p = offData.product;
            const nutriments = p.nutriments || {};
            const rawData = {
                name: p.product_name || 'Unknown Product',
                brand: p.brands || 'Unknown Brand',
                ingredients: p.ingredients_text?.split(',').map((s) => s.trim()) || [],
                nutrients: {
                    energy_kcal: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
                    protein_g: nutriments['proteins_100g'] || nutriments['proteins'] || 0,
                    carbohydrate_g: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0,
                    fat_g: nutriments['fat_100g'] || nutriments['fat'] || 0,
                    saturated_fat_g: nutriments['saturated-fat_100g'] || nutriments['saturated-fat'] || 0,
                    trans_fat_g: nutriments['trans-fat_100g'] || nutriments['trans-fat'] || 0,
                    sugar_g: nutriments['sugars_100g'] || nutriments['sugars'] || 0,
                    sodium_mg: (nutriments['sodium_100g'] || 0) * 1000,
                },
                warnings: []
            };
            // Detect incomplete nutritional data (product exists in OFF but has no nutrient values)
            const incomplete = isNutritionIncomplete(rawData.nutrients);
            const analysis = (0, analysisEngine_1.analyzeProduct)(rawData, profile);
            const productRecord = {
                ...rawData,
                barcode,
                productImageUrl: p.image_url || null,
                dataSource: 'OpenFoodFacts',
                isEditable: false,
                isIncomplete: incomplete,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            // Cache locally
            await db.collection('products').doc(barcode).set(productRecord);
            // Log history
            await logToUserHistory(uid, productRecord, analysis.grade);
            return { ...productRecord, ...analysis };
        }
    }
    catch (error) {
        console.error("OFF API Error:", error);
    }
    // 2. Check local database (for previously saved OCR results)
    const docRef = db.collection('products').doc(barcode);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const rawData = docSnap.data();
        const analysis = (0, analysisEngine_1.analyzeProduct)(rawData, profile);
        // Log history even if cached
        await logToUserHistory(uid, rawData, analysis.grade);
        return { ...rawData, ...analysis, cached: true };
    }
    return { found: false, barcode };
});
async function logToUserHistory(uid, product, rating) {
    await db.collection('users').doc(uid).collection('scans').add({
        barcode: product.barcode || 'manual',
        name: product.name || 'Unknown Product',
        brand: product.brand || 'Unknown Brand',
        rating: rating || 'C',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
}
/**
 * onOCRSubmit — Creates a NEW product from a nutrition label photo.
 * Called when no existing product record exists and user scans a fresh label.
 * Stores the label photo URL in referenceImages.nutritionLabel (NOT as productImageUrl).
 */
exports.onOCRSubmit = functionsV1.runWith({
    timeoutSeconds: 60,
    memory: '512MB',
    secrets: [GEMINI_API_KEY]
}).https.onCall(async (data, context) => {
    const { barcode, ocrText, labelImageUrl, imageType = 'nutritionLabel' } = data;
    const uid = context.auth?.uid;
    if (!uid)
        throw new functionsV1.https.HttpsError('unauthenticated', 'User must be logged in.');
    await incrementUserScanCount(uid);
    try {
        const rawData = await (0, ocrParser_1.parseNutritionOCR)(ocrText, labelImageUrl, GEMINI_API_KEY.value(), data.useAiOnly ?? false);
        if (rawData === 'failed') {
            throw new functionsV1.https.HttpsError('invalid-argument', 'Image does not contain valid nutrition data. Please try again.');
        }
        const profile = await getUserProfile(uid);
        const analysis = (0, analysisEngine_1.analyzeProduct)(rawData, profile);
        // Build referenceImages map — nutrition labels, ingredient photos, etc.
        // These are stored separately from productImageUrl which is only set by user's gallery upload.
        const referenceImages = {};
        if (labelImageUrl) {
            referenceImages[imageType] = labelImageUrl;
        }
        const productRecord = {
            barcode,
            ...rawData,
            // referenceImages stores scan reference photos, NOT the product display image
            referenceImages,
            // productImageUrl is intentionally NOT set here — only set via explicit user gallery upload
            productImageUrl: null,
            dataSource: 'OCR+AI',
            isEditable: true,
            isIncomplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (barcode && barcode !== 'manual-entry' && barcode !== 'manual-ocr') {
            // Save RAW metadata
            await db.collection('products').doc(barcode).set(productRecord);
        }
        console.log(`OCR Analysis for ${uid}:`, JSON.stringify(analysis));
        // Log to user history
        await db.collection('users').doc(uid).collection('scans').add({
            barcode: barcode || 'manual-ocr',
            name: productRecord.name || 'Unknown Product',
            brand: productRecord.brand || 'Unknown Brand',
            rating: analysis.grade || 'C',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { ...productRecord, ...analysis };
    }
    catch (e) {
        console.error("OCR Parse Error:", e);
        throw new functionsV1.https.HttpsError('internal', 'Failed to parse nutrition label: ' + e.message);
    }
});
/**
 * onOCRUpdate — Updates an EXISTING product from a nutrition label photo.
 * Called when user taps "Something look wrong?" and re-scans the label.
 * - Merges new nutrition data into the existing product.
 * - Upgrades dataSource to 'OCR+AI' and sets isEditable: true.
 * - Clears isIncomplete flag.
 * - Does NOT increment scan count (it's a correction, not a new scan).
 */
exports.onOCRUpdate = functionsV1.runWith({
    timeoutSeconds: 60,
    memory: '512MB',
    secrets: [GEMINI_API_KEY]
}).https.onCall(async (data, context) => {
    const { barcode, ocrText, labelImageUrl, imageType = 'nutritionLabel' } = data;
    const uid = context.auth?.uid;
    if (!uid)
        throw new functionsV1.https.HttpsError('unauthenticated', 'User must be logged in.');
    if (!barcode) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'barcode is required for OCR update.');
    }
    try {
        const rawData = await (0, ocrParser_1.parseNutritionOCR)(ocrText, labelImageUrl, GEMINI_API_KEY.value(), data.useAiOnly ?? false);
        if (rawData === 'failed') {
            throw new functionsV1.https.HttpsError('invalid-argument', 'Image does not contain valid nutrition data. Please try again.');
        }
        const profile = await getUserProfile(uid);
        const analysis = (0, analysisEngine_1.analyzeProduct)(rawData, profile);
        const docRef = db.collection('products').doc(barcode);
        const existingDoc = await docRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};
        // Build updated referenceImages — merge with any existing reference images
        const existingReferenceImages = existingData?.referenceImages || {};
        const updatedReferenceImages = { ...existingReferenceImages };
        if (labelImageUrl) {
            updatedReferenceImages[imageType] = labelImageUrl;
        }
        const updatedProduct = {
            // Keep existing fields (name, brand, productImageUrl, etc.) unless OCR found better values
            ...existingData,
            // Merge in new OCR data
            ...rawData,
            barcode,
            // Reference images updated — NOT productImageUrl
            referenceImages: updatedReferenceImages,
            // Upgrade metadata
            dataSource: 'OCR+AI',
            isEditable: true,
            isIncomplete: false,
            lastEditedBy: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Upsert (create if didn't exist, update if did)
        await docRef.set(updatedProduct, { merge: false });
        console.log(`OCR Update for barcode ${barcode} by ${uid}`);
        return { ...updatedProduct, ...analysis };
    }
    catch (e) {
        console.error("OCR Update Error:", e);
        throw new functionsV1.https.HttpsError('internal', 'Failed to update product from nutrition label: ' + e.message);
    }
});
async function incrementUserScanCount(uid) {
    const todayStr = new Date().toISOString().split('T')[0];
    const usageRef = db.collection('users').doc(uid).collection('usage').doc('today');
    await db.runTransaction(async (t) => {
        const doc = await t.get(usageRef);
        if (!doc.exists) {
            t.set(usageRef, { date: todayStr, count: 1, lastScanAt: admin.firestore.FieldValue.serverTimestamp() });
        }
        else {
            const data = doc.data();
            if (data?.date !== todayStr) {
                t.set(usageRef, { date: todayStr, count: 1, lastScanAt: admin.firestore.FieldValue.serverTimestamp() });
            }
            else {
                t.update(usageRef, { count: admin.firestore.FieldValue.increment(1), lastScanAt: admin.firestore.FieldValue.serverTimestamp() });
            }
        }
    });
}
exports.onRevenueCatWebhook = functions.https.onRequest(async (req, res) => {
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
        }
        else if (eventType === 'CANCELLATION' || eventType === 'EXPIRATION') {
            await userRef.collection('subscription').doc('current').set({
                status: 'free',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        res.status(200).send('Webhook processed');
    }
    catch (error) {
        console.error('Webhook processing error', error);
        res.status(500).send('Internal Error');
    }
});
exports.onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
    const uid = user.uid;
    const userRef = db.collection('users').doc(uid);
    // Recursive delete or delete immediate subcollections: Note, in a real env, use firebase tools specialized function for recursive delete
    await userRef.delete();
    console.log(`Deleted user ${uid}`);
});
exports.scheduledDailyReset = functions.scheduler.onSchedule('every day 00:00', async (event) => {
    // While scan count logic already lazily resets if the date doesn't match, 
    // we can use this to aggregate analytics.
    console.log('Daily reset running at', event.scheduleTime);
});
exports.onProductFlagged = functions.firestore.onDocumentCreated('reports/{reportId}', async (event) => {
    const snap = event.data;
    if (!snap)
        return;
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
exports.updateProduct = functionsV1.https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
        throw new functionsV1.https.HttpsError('unauthenticated', 'User must be logged in.');
    const { barcode, updates } = data;
    if (!barcode || !updates) {
        throw new functionsV1.https.HttpsError('invalid-argument', 'Missing barcode or updates payload.');
    }
    const docRef = db.collection('products').doc(barcode);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new functionsV1.https.HttpsError('not-found', 'Product not found.');
    }
    const product = docSnap.data();
    if (!product?.isEditable) {
        throw new functionsV1.https.HttpsError('permission-denied', 'This product cannot be edited by users.');
    }
    // Safely merge allowed updates
    const allowedUpdates = {};
    if (updates.name !== undefined)
        allowedUpdates.name = updates.name;
    if (updates.brand !== undefined)
        allowedUpdates.brand = updates.brand;
    if (updates.productImageUrl !== undefined)
        allowedUpdates.productImageUrl = updates.productImageUrl;
    if (updates.nutrients !== undefined) {
        allowedUpdates.nutrients = {
            ...(product.nutrients || {}),
            ...updates.nutrients
        };
    }
    // Allow updating individual reference image slots
    if (updates.referenceImages !== undefined) {
        allowedUpdates.referenceImages = {
            ...(product.referenceImages || {}),
            ...updates.referenceImages,
        };
    }
    allowedUpdates.lastEditedBy = uid;
    allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await docRef.update(allowedUpdates);
    return { success: true, updatedFields: allowedUpdates };
});
//# sourceMappingURL=index.js.map