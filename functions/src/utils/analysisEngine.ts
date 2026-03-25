import harmfulData from '../data/harmfulIngredients.json';

export interface NutritionData {
  name?: string;
  brand?: string;
  ingredients: string[];
  nutrients: {
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  healthScore?: number;
  warnings: Array<{
    ingredient: string;
    reason: string;
    severity: string;
  }>;
  grade?: 'A' | 'B' | 'C' | 'D' | 'E';
}

interface HarmfulIngredient {
  name: string;
  aliases: string[];
  eNumber?: string;
  harmfulFor: string[];
  severity: string;
  description: string;
}

const HARMFUL_LIST = harmfulData as unknown as HarmfulIngredient[];

export function analyzeProduct(data: Partial<NutritionData>, userProfile?: any): any {
  const warnings: Array<{ ingredient: string, reason: string, severity: string }> = [];
  let score = 100;

  const userConditions = userProfile?.healthProfiles || ['general'];
  
  if (data.ingredients) {
    data.ingredients.forEach(ing => {
      const ingLower = ing.toLowerCase();
      
      const found = HARMFUL_LIST.find(h => 
        ingLower.includes(h.name.toLowerCase()) || 
        h.aliases.some(a => ingLower.includes(a.toLowerCase())) ||
        (h.eNumber && ingLower.includes(h.eNumber.toLowerCase()))
      );

      if (found) {
        const isHarmfulForUser = found.harmfulFor.some(c => userConditions.includes(c));
        if (isHarmfulForUser) {
          warnings.push({
            ingredient: found.name,
            reason: found.description,
            severity: found.severity
          });

          // Weight score reduction by severity
          if (found.severity === 'high') score -= 25;
          else if (found.severity === 'medium') score -= 15;
          else score -= 5;
        }
      }
    });
  }

  // Nutritional penalties
  if ((data.nutrients?.sugar_g || 0) > 15) {
    warnings.push({ ingredient: 'Added Sugar', reason: 'High sugar content spikes insulin and leads to fat storage.', severity: 'medium' });
    score -= 15;
  }
  if ((data.nutrients?.sodium_mg || 0) > 400) {
    warnings.push({ ingredient: 'Sodium', reason: 'High sodium increases blood pressure and heart strain.', severity: 'medium' });
    score -= 10;
  }

  let grade: 'A' | 'B' | 'C' | 'D' | 'E' = 'C';
  if (score >= 90) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else if (score >= 30) grade = 'D';
  else grade = 'E';

  return {
    ...data,
    healthScore: Math.max(0, score),
    warnings,
    grade
  };
}
