"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNutritionOCR = parseNutritionOCR;
const generative_ai_1 = require("@google/generative-ai");
async function parseNutritionOCR(ocrText, geminiKey) {
    // --- PHASE 1: Local Regex Parse (Cost: $0) ---
    const localResult = parseNutritionLocal(ocrText);
    // If we found both name and some nutrients, we consider it a success for local parsing
    const isLocalEnough = localResult.name &&
        (localResult.nutrients.sugar_g > 0 || localResult.ingredients.length > 5);
    if (isLocalEnough && !ocrText.includes("FAILED_LOCAL")) {
        console.log("Local OCR Parse Succeeded");
        return localResult;
    }
    // --- PHASE 2: Gemini 2.5 Pro Fallback (High Quality, Expensive) ---
    console.log("Falling back to Gemini 2.5 Pro for parsing...");
    const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const prompt = `
    Analyze this OCR text from a food product. Extract structured data carefully. 
    DO NOT guess the product name or brand. If they are NOT clearly visible on the label, return an empty string "".
    Format the output as STRICT JSON:
    {
      "name": "string",
      "brand": "string",
      "ingredients": ["string"],
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
    OCR Text: ${ocrText}
  `;
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('Failed to parse AI response');
        return JSON.parse(jsonMatch[0]);
    }
    catch (e) {
        console.error("Gemini Parse Failed:", e);
        // If Gemini fails, we return the local result anyway as a last resort
        return localResult;
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