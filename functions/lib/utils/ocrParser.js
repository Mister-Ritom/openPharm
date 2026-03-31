"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNutritionOCR = parseNutritionOCR;
const generative_ai_1 = require("@google/generative-ai");
async function parseNutritionOCR(ocrText, labelImageUrl, geminiKey, useAiOnly) {
    // --- PHASE 1: Local Regex Parse (Cost: $0) ---
    if (!useAiOnly && ocrText) {
        const localResult = parseNutritionLocal(ocrText);
        // If we found both name and some nutrients, we consider it a success for local parsing
        const isLocalEnough = localResult.name &&
            (localResult.nutrients.sugar_g > 0 || localResult.ingredients.length > 5);
        if (isLocalEnough && !ocrText.includes("FAILED_LOCAL")) {
            console.log("Local OCR Parse Succeeded");
            return localResult;
        }
    }
    // --- PHASE 2: Gemini 2.5 Pro Vision ---
    console.log(`Falling back to Gemini 2.5 Pro (useAiOnly: ${useAiOnly})...`);
    const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    let base64Image = null;
    if (labelImageUrl) {
        try {
            const resp = await fetch(labelImageUrl);
            const buffer = await resp.arrayBuffer();
            base64Image = Buffer.from(buffer).toString('base64');
        }
        catch (e) {
            console.error("Failed to fetch image for Gemini:", e);
        }
    }
    const prompt = `
    Analyze this nutrition label image carefully. You MUST extract the nutrition data.
    If you cannot find clear nutrition data, you MUST return exactly the word "failed" and nothing else.
    If you do find nutrition data, return STRICT JSON format exactly like this:
    {
      "name": "string",
      "brand": "string",
      "ingredients": ["string"] | null,
      "nutrients": {
        "energy_kcal": number,
        "protein_g": number,
        "fat_g": number,
        "saturated_fat_g": number,
        "trans_fat_g": number,
        "carbohydrate_g": number,
        "sugar_g": number,
        "sodium_mg": number
      }
    }
    DO NOT guess the product name or brand. If they are NOT clearly visible in the image, return an empty string "".
    Extract the product name and brand if they are visible in the image.
    If you can find ingredients, return them as an array of strings. If you cannot find ingredients, return null.
  `;
    const parts = [{ text: prompt }];
    if (!useAiOnly && ocrText) {
        parts.push({ text: `\n\nOCR Text from device:\n${ocrText}` });
    }
    if (base64Image) {
        parts.push({
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
            }
        });
    }
    try {
        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text().trim();
        if (text.toLowerCase() === 'failed') {
            return 'failed';
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('Failed to parse AI response');
        const parsed = JSON.parse(jsonMatch[0]);
        // Ensure ingredients is an array if returned as null
        if (parsed.ingredients === null) {
            parsed.ingredients = [];
        }
        return parsed;
    }
    catch (e) {
        console.error("Gemini Parse Failed:", e);
        // If Gemini fails and we are not strictly AI only, we return local fallback
        if (!useAiOnly) {
            return parseNutritionLocal(ocrText);
        }
        return 'failed';
    }
}
function parseNutritionLocal(text) {
    const data = {
        name: '',
        brand: '',
        ingredients: [],
        nutrients: {
            energy_kcal: 0,
            protein_g: 0,
            fat_g: 0,
            saturated_fat_g: 0,
            trans_fat_g: 0,
            carbohydrate_g: 0,
            sugar_g: 0,
            sodium_mg: 0
        }
    };
    // Nutrient extraction via regex
    const sugarMatch = text.match(/sugar[s]?[:\s]*(\d+\.?\d*)/i);
    if (sugarMatch)
        data.nutrients.sugar_g = parseFloat(sugarMatch[1]);
    const proteinMatch = text.match(/protein[:\s]*(\d+\.?\d*)/i);
    if (proteinMatch)
        data.nutrients.protein_g = parseFloat(proteinMatch[1]);
    const sodiumMatch = text.match(/sodium[:\s]*(\d+\.?\d*)/i);
    if (sodiumMatch)
        data.nutrients.sodium_mg = parseFloat(sodiumMatch[1]);
    const fatMatch = text.match(/fat[:\s]*(\d+\.?\d*)/i);
    if (fatMatch)
        data.nutrients.fat_g = parseFloat(fatMatch[1]);
    const carbMatch = text.match(/(?:carbohydrates?|carbs?)[:\s]*(\d+\.?\d*)/i);
    if (carbMatch)
        data.nutrients.carbohydrate_g = parseFloat(carbMatch[1]);
    const satFatMatch = text.match(/(?:saturated fat|sat\.? fat)[:\s]*(\d+\.?\d*)/i);
    if (satFatMatch)
        data.nutrients.saturated_fat_g = parseFloat(satFatMatch[1]);
    const transFatMatch = text.match(/trans fat[:\s]*(\d+\.?\d*)/i);
    if (transFatMatch)
        data.nutrients.trans_fat_g = parseFloat(transFatMatch[1]);
    // Ingredient extraction (everything after "Ingredients:")
    const ingMatch = text.match(/ingredients?[:\s]*([\s\S]*?)(?:\.|\n\n|Nutrition|$)/i);
    if (ingMatch) {
        data.ingredients = ingMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
    }
    return data;
}
//# sourceMappingURL=ocrParser.js.map