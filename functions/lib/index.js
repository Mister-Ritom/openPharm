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
exports.updateProduct = exports.onProductFlagged = exports.scheduledDailyReset = exports.onUserDeleted = exports.onRevenueCatWebhook = exports.onOCRUpdate = exports.onOCRSubmit = exports.onScanProduct = exports.cacheProduct = void 0;
const functions = __importStar(require("firebase-functions/v2"));
const functionsV1 = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const ocrParser_1 = require("./utils/ocrParser");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
// Define secret object for Gemini API
const GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
/**
 * cacheProduct — Background function called by the client after a successful Open Food Facts lookup.
 * It caches the OFF data into Firestore so future scans are instant.
 */
exports.cacheProduct = functions.https.onCall({
    timeoutSeconds: 30,
}, async (request) => {
    const { barcode, productData } = request.data;
    const uid = request.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    if (!barcode || !productData) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing barcode or productData.');
    }
    // Check if it already exists
    const docRef = db.collection('products').doc(barcode);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        return { skipped: true, reason: 'Already exists' };
    }
    try {
        const productRecord = {
            ...productData,
            barcode,
            dataSource: 'OpenFoodFacts',
            isEditable: true,
            isIncomplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Cache locally
        await docRef.set(productRecord);
        return { cached: true };
    }
    catch (error) {
        console.error("Cache Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to cache product.');
    }
});
/**
 * onScanProduct — Deprecated (Keeping export so old clients don't crash).
 */
exports.onScanProduct = functions.https.onCall({
    timeoutSeconds: 30,
}, async (request) => {
    throw new functions.https.HttpsError('failed-precondition', 'Please update the app. This scanning method is deprecated.');
});
/**
 * onOCRSubmit — Creates a NEW product from a nutrition label photo using Gemini AI.
 * Called when no existing product record exists and user scans a fresh label.
 * Returns raw extracted data without analysis (client handles analysis).
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
    try {
        const rawData = await (0, ocrParser_1.parseNutritionOCR)(ocrText, labelImageUrl, GEMINI_API_KEY.value(), data.useAiOnly ?? false);
        if (rawData === 'failed') {
            throw new functionsV1.https.HttpsError('invalid-argument', 'Image does not contain valid nutrition data. Please try again.');
        }
        const referenceImages = {};
        if (labelImageUrl) {
            referenceImages[imageType] = labelImageUrl;
        }
        const productRecord = {
            barcode,
            ...rawData,
            referenceImages,
            productImageUrl: null,
            dataSource: 'OCR+AI',
            isEditable: true,
            isIncomplete: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (barcode && barcode !== 'manual-entry' && barcode !== 'manual-ocr') {
            await db.collection('products').doc(barcode).set(productRecord);
        }
        return productRecord;
    }
    catch (e) {
        console.error("OCR Parse Error:", e);
        throw new functionsV1.https.HttpsError('internal', 'Failed to parse nutrition label: ' + e.message);
    }
});
/**
 * onOCRUpdate — Updates an EXISTING product from a nutrition label photo using Gemini AI.
 * Returns raw updated data without analysis (client handles analysis).
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
        const docRef = db.collection('products').doc(barcode);
        const existingDoc = await docRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : {};
        const existingReferenceImages = existingData?.referenceImages || {};
        const updatedReferenceImages = { ...existingReferenceImages };
        if (labelImageUrl) {
            updatedReferenceImages[imageType] = labelImageUrl;
        }
        const updatedProduct = {
            ...existingData,
            ...rawData,
            barcode,
            referenceImages: updatedReferenceImages,
            dataSource: 'OCR+AI',
            isEditable: true,
            isIncomplete: false,
            lastEditedBy: uid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await docRef.set(updatedProduct, { merge: false });
        return updatedProduct;
    }
    catch (e) {
        console.error("OCR Update Error:", e);
        throw new functionsV1.https.HttpsError('internal', 'Failed to update product from nutrition label: ' + e.message);
    }
});
exports.onRevenueCatWebhook = functions.https.onRequest(async (req, res) => {
    const event = req.body?.event;
    if (!event) {
        res.status(400).send('No event found');
        return;
    }
    const rcUserId = event.app_user_id;
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
    await userRef.delete();
    console.log(`Deleted user ${uid}`);
});
exports.scheduledDailyReset = functions.scheduler.onSchedule('every day 00:00', async (event) => {
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