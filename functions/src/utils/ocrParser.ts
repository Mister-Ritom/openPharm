import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export async function parseNutritionOCR(ocrText: string, labelImageUrl: string, geminiKey: string, useAiOnly: boolean) {
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
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

  let base64Image: string | null = null;
  if (labelImageUrl) {
    try {
      console.log(`Fetching image from: ${labelImageUrl}`);
      const resp = await fetch(labelImageUrl);
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      const buffer = await resp.arrayBuffer();
      base64Image = Buffer.from(buffer).toString('base64');
    } catch (e) {
      console.error("Failed to fetch image for Gemini:", e);
    }
  }

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      name: { 
        type: SchemaType.STRING, 
        description: "The product name. If not visible, return 'Not found'." 
      },
      brand: { 
        type: SchemaType.STRING, 
        description: "The brand name. If not visible, return 'Not found'." 
      },
      ingredients: { 
        type: SchemaType.ARRAY, 
        items: { type: SchemaType.STRING },
        nullable: true,
        description: "List of individual ingredients. Make sure to properly split ingredients into separate array items, do NOT return a single comma-separated string. If no ingredients are found, return null."
      },
      nutrients: {
        type: SchemaType.OBJECT,
        properties: {
          energy_kcal: { type: SchemaType.NUMBER },
          protein_g: { type: SchemaType.NUMBER },
          fat_g: { type: SchemaType.NUMBER },
          saturated_fat_g: { type: SchemaType.NUMBER },
          trans_fat_g: { type: SchemaType.NUMBER },
          carbohydrate_g: { type: SchemaType.NUMBER },
          sugar_g: { type: SchemaType.NUMBER },
          sodium_mg: { type: SchemaType.NUMBER }
        },
        required: ["energy_kcal", "protein_g", "fat_g", "saturated_fat_g", "trans_fat_g", "carbohydrate_g", "sugar_g", "sodium_mg"],
        description: "Nutritional data per 100g. If a value is missing or unreadable, return -999."
      },
      status: {
        type: SchemaType.STRING,
        enum: ["success", "partial", "failed"],
        description: "Set to 'success' if name and main nutrients are found. 'partial' if some data is missing. 'failed' if no readable nutrition label is present."
      }
    },
    required: ["name", "brand", "nutrients", "status"]
  };

  const prompt = `You are a professional dietitian assistant. Extract the nutritional data and ingredients from the provided image/text.
  
  GUIDELINES:
  - PRIORITIZE finding values "per 100g" or "per 100ml". This is the gold standard.
  - If "per 100g" data is NOT available, only then look for values "per serving".
  - If using "per serving" values, you MUST convert them to "per 100g/100ml" based on the serving size.
  - If the product name or brand is not explicitly visible, look for indicators or set to "Unknown".
  - If a nutrient is missing, use -999.
  - If the image is NOT a nutrition label, set status to 'failed' and name to 'No label detected'.
  - If you find some data but the image is poor quality, set status to 'partial'.
  - RETURN VALID JSON ONLY.`;

  const parts: any[] = [{ text: prompt }];
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
        mediaResolution: "MEDIA_RESOLUTION_LOW",
      } as any
    });
    
    // Log the raw text returned by Gemini before parsing
    const text = result.response.text().trim();
    console.log("Raw Gemini Response:", text);
    
    // Parse the natively structured JSON response
    const parsed = JSON.parse(text);
    
    if (parsed.status === 'failed' || (parsed.name && parsed.name.toLowerCase() === 'failed')) {
      return 'failed';
    }

    // Ensure ingredients is an array
    if (!Array.isArray(parsed.ingredients)) {
      parsed.ingredients = [];
    }

    // Set isIncomplete flag if any of the mandatory nutrients are missing (-999)
    if (parsed.nutrients) {
      const nutrientValues = Object.values(parsed.nutrients);
      if (nutrientValues.some(v => v === -999) || parsed.status === 'partial') {
        parsed.isIncomplete = true;
      }
    }
    
    return parsed;
  } catch (e) {
    console.error("Gemini Parse Failed:", e);
    // If Gemini fails and we are not strictly AI only, we return local fallback
    if (!useAiOnly) {
      return parseNutritionLocal(ocrText);
    }
    return 'failed';
  }
}

function parseNutritionLocal(text: string) {
  const data = {
    name: '',
    brand: '',
    ingredients: [] as string[],
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
  if (sugarMatch) data.nutrients.sugar_g = parseFloat(sugarMatch[1]);

  const proteinMatch = text.match(/protein[:\s]*(\d+\.?\d*)/i);
  if (proteinMatch) data.nutrients.protein_g = parseFloat(proteinMatch[1]);

  const sodiumMatch = text.match(/sodium[:\s]*(\d+\.?\d*)/i);
  if (sodiumMatch) data.nutrients.sodium_mg = parseFloat(sodiumMatch[1]);

  const fatMatch = text.match(/fat[:\s]*(\d+\.?\d*)/i);
  if (fatMatch) data.nutrients.fat_g = parseFloat(fatMatch[1]);

  const carbMatch = text.match(/(?:carbohydrates?|carbs?)[:\s]*(\d+\.?\d*)/i);
  if (carbMatch) data.nutrients.carbohydrate_g = parseFloat(carbMatch[1]);

  const satFatMatch = text.match(/(?:saturated fat|sat\.? fat)[:\s]*(\d+\.?\d*)/i);
  if (satFatMatch) data.nutrients.saturated_fat_g = parseFloat(satFatMatch[1]);

  const transFatMatch = text.match(/trans fat[:\s]*(\d+\.?\d*)/i);
  if (transFatMatch) data.nutrients.trans_fat_g = parseFloat(transFatMatch[1]);

  // Ingredient extraction (everything after "Ingredients:")
  const ingMatch = text.match(/ingredients?[:\s]*([\s\S]*?)(?:\.|\n\n|Nutrition|$)/i);
  if (ingMatch) {
    data.ingredients = ingMatch[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
  }

  return data;
}
