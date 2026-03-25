import { NutritionData } from './analysisEngine';

/**
 * Basic regex-based text extraction for nutrition labels.
 * Designed to act as a fast, free, on-device fallback before using AI.
 * 
 * Target phrases: "Energy", "Calories", "Total Fat", "Saturated Fat", "Trans Fat", "Sodium", "Total Carbohydrate", "Sugars", "Protein"
 */
export function parseNutritionOCR(ocrText: string): { data: Partial<NutritionData>, confidence: number } {
  const text = ocrText.replace(/\n/g, ' ').toLowerCase();
  
  const data: Partial<NutritionData> = {};
  let confidenceScore = 0;
  let matches = 0;

  // Regex helpers matching common nutrition label formats e.g., "Sugars 12g"
  const matchAmount = (regex: RegExp) => {
    const match = text.match(regex);
    if (match && match[1]) {
      matches++;
      return parseFloat(match[1]);
    }
    return undefined;
  };

  data.energyKcal = matchAmount(/(?:energy|calories|kcal)\s*(?:of which)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:kcal)?/);
  data.totalSugarsG = matchAmount(/(?:sugar|sugars|added sugars)\s*(?:of which)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/);
  data.totalFatG = matchAmount(/(?:total fat|fat)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/);
  data.saturatedFatG = matchAmount(/(?:saturated fat|sat fat)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/);
  data.sodiumMg = matchAmount(/(?:sodium|salt)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:mg|g)/);
  if (data.sodiumMg && text.includes('salt')) { // convert salt g to sodium mg approx if matched salt
      // Salt is roughly 40% sodium (NaCl)
      // data.sodiumMg = data.sodiumMg * 1000 * 0.4;
  }
  data.proteinG = matchAmount(/(?:protein)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/);
  data.carbohydratesG = matchAmount(/(?:carbohydrate|carbs|total carbohydrate)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*g/);
  
  // Extract ingredients list block
  const ingredientsMatch = text.match(/(?:ingredients|ingredients list)[:\-\s]+(.*?)(?:\.|$)/i);
  data.ingredientsList = ingredientsMatch ? ingredientsMatch[1] : ocrText; // fallback to whole text if block not found
  if (ingredientsMatch) matches++;

  // Simple confidence heuristic: 8 possible key fields. 
  confidenceScore = Math.min(100, Math.round((matches / 8) * 100));

  return { data, confidence: confidenceScore };
}
