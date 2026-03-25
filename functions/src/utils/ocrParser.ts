import { GoogleGenerativeAI } from '@google/generative-ai';

export async function parseNutritionOCR(ocrText: string, geminiKey: string) {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
    Extract structured nutrition data from this OCR text. 
    Format the output as JSON with the following schema:
    {
      "name": "string",
      "brand": "string",
      "ingredients": ["string"],
      "nutrients": {
        "energy_kcal": number,
        "protein_g": number,
        "fat_g": number,
        "sugar_g": number,
        "sodium_mg": number
      }
    }
    Text: ${ocrText}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  // Basic JSON cleaning
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  
  return JSON.parse(jsonMatch[0]);
}
