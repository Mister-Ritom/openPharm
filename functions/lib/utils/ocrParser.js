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
    // --- PHASE 2: Gemini Flash Lite ---
    console.log(`Falling back to Gemini Flash Lite (useAiOnly: ${useAiOnly})...`);
    const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
    let base64Image = null;
    if (labelImageUrl) {
        try {
            console.log(`Fetching image from: ${labelImageUrl}`);
            const resp = await fetch(labelImageUrl);
            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }
            const buffer = await resp.arrayBuffer();
            base64Image = Buffer.from(buffer).toString('base64');
            console.log(`Image fetched successfully. Base64 length: ${base64Image.length}`);
        }
        catch (e) {
            console.error("Failed to fetch image for Gemini:", e);
        }
    }
    const responseSchema = {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            name: {
                type: generative_ai_1.SchemaType.STRING,
                description: "The product name. If not visible, return 'not found'."
            },
            brand: {
                type: generative_ai_1.SchemaType.STRING,
                description: "The brand name. If not visible, return 'not found'."
            },
            ingredients: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                nullable: true,
                description: "List of individual ingredients. Make sure to properly split ingredients into separate array items, do NOT return a single comma-separated string. If no ingredients are found, return null."
            },
            nutrients: {
                type: generative_ai_1.SchemaType.OBJECT,
                properties: {
                    energy_kcal: { type: generative_ai_1.SchemaType.NUMBER },
                    protein_g: { type: generative_ai_1.SchemaType.NUMBER },
                    fat_g: { type: generative_ai_1.SchemaType.NUMBER },
                    saturated_fat_g: { type: generative_ai_1.SchemaType.NUMBER },
                    trans_fat_g: { type: generative_ai_1.SchemaType.NUMBER },
                    carbohydrate_g: { type: generative_ai_1.SchemaType.NUMBER },
                    sugar_g: { type: generative_ai_1.SchemaType.NUMBER },
                    sodium_mg: { type: generative_ai_1.SchemaType.NUMBER }
                },
                required: ["energy_kcal", "protein_g", "fat_g", "saturated_fat_g", "trans_fat_g", "carbohydrate_g", "sugar_g", "sodium_mg"],
                description: "Nutritional data per 100g, can be 0. If not visible, return -999."
            }
        },
        required: ["name", "brand", "nutrients"]
    };
    const prompt = `Extract the nutritional data and ingredients from this label according to the provided JSON schema. If the image does not contain clear nutrition data, you MUST return a valid JSON object with the product 'name' as "failed" and empty/zero for other fields.`;
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
        const result = await model.generateContent({
            contents: [{ role: "user", parts }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });
        // Log the raw text returned by Gemini before parsing
        const text = result.response.text().trim();
        console.log("Raw Gemini Response:", text);
        // Parse the natively structured JSON response
        const parsed = JSON.parse(text);
        if (parsed.name && parsed.name.toLowerCase() === 'failed') {
            return 'failed';
        }
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