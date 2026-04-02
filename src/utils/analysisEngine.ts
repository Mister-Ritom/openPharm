import harmfulData from '../../assets/data/harmfulIngredients.json';
import thresholdsData from '../../assets/data/nutritionalThresholds.json';

export interface NutritionData {
  name?: string;
  brand?: string;
  ingredients: string[];
  nutrients: {
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    saturated_fat_g?: number;
    trans_fat_g?: number;
    carbohydrate_g?: number;
    sugar_g: number;
    sodium_mg: number;
    fiber_g?: number;
    cholesterol_mg?: number;
  };
  healthScore?: number;
  warnings: Array<{
    ingredient: string;
    reason: string;
    severity: string;
    source?: string;
  }>;
  grade?: 'A' | 'B' | 'C' | 'D' | 'E';
  isEditable?: boolean;
  labelImageUrl?: string;
  productImageUrl?: string;
  isIncomplete?: boolean;
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
const THRESHOLDS = thresholdsData as any;

export function analyzeProduct(data: Partial<NutritionData>, userProfile?: any): any {
  const warnings: Array<{ ingredient: string, reason: string, severity: string, source?: string }> = [];
  let score = 100;

  const userConditions = userProfile?.healthProfiles || ['general'];
  
  if (data.ingredients) {
    data.ingredients.forEach(ing => {
      const ingLower = ing.toLowerCase();
      
      const found = HARMFUL_LIST.find(h => 
        ingLower.includes(h.name.toLowerCase()) || 
        h.aliases?.some(a => ingLower.includes(a.toLowerCase())) ||
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

  // Nutritional penalties ("Dosage" checks)
  const sugar = data.nutrients?.sugar_g || 0;
  const sodium = data.nutrients?.sodium_mg || 0;
  const totalFat = data.nutrients?.fat_g || 0;
  const satFat = data.nutrients?.saturated_fat_g || 0;
  const transFat = data.nutrients?.trans_fat_g || 0;
  const carbs = data.nutrients?.carbohydrate_g || 0;
  const calories = data.nutrients?.energy_kcal || 0;
  const cholesterol = data.nutrients?.cholesterol_mg || 0;
  const protein = data.nutrients?.protein_g || 0;

  userConditions.forEach((condition: string) => {
    const limits = THRESHOLDS[condition] || THRESHOLDS.general;
    const formattedCondition = condition.replace(/_/g, ' ');
    
    // Fetch the medical source or fallback to general guideline organizations
    const conditionSource = limits._source || 
      THRESHOLDS._meta?.sources?.join('; ') || 
      "FDA Dietary Guidelines, WHO Global Action Plan, and relevant medical associations.";

    if (limits.max_sugar_g && sugar > limits.max_sugar_g) {
      warnings.push({ 
        ingredient: 'Sugar', 
        reason: `Exceeds your ${formattedCondition} limit of ${limits.max_sugar_g}g. High sugar spikes insulin.`, 
        severity: 'high',
        source: conditionSource
      });
      score -= 20;
    }
    
    if (limits.max_sodium_mg && sodium > limits.max_sodium_mg) {
      warnings.push({ 
        ingredient: 'Sodium', 
        reason: `Exceeds your ${formattedCondition} limit of ${limits.max_sodium_mg}mg. Increases blood pressure.`, 
        severity: 'medium',
        source: conditionSource
      });
      score -= 10;
    }

    if (limits.max_total_fat_g && totalFat > limits.max_total_fat_g) {
      warnings.push({ 
        ingredient: 'Total Fat', 
        reason: `Exceeds your ${formattedCondition} recommended limit of ${limits.max_total_fat_g}g.`, 
        severity: 'low',
        source: conditionSource
      });
      score -= 5;
    }

    if (limits.max_sat_fat_g) {
      if (satFat > limits.max_sat_fat_g) {
        warnings.push({ 
          ingredient: 'Saturated Fat', 
          reason: `Exceeds your ${formattedCondition} limit of ${limits.max_sat_fat_g}g.`, 
          severity: 'medium',
          source: conditionSource
        });
        score -= 10;
      } else if (satFat === 0 && totalFat > (limits.max_sat_fat_g * 1.5)) {
        warnings.push({ 
          ingredient: 'Fat', 
          reason: `High total fat may contain excessive saturated fat for your ${formattedCondition} limit.`, 
          severity: 'low',
          source: conditionSource
        });
        score -= 5;
      }
    }

    if (limits.max_trans_fat_g && transFat > limits.max_trans_fat_g) {
      warnings.push({ 
        ingredient: 'Trans Fat', 
        reason: `Exceeds your ${formattedCondition} limit of ${limits.max_trans_fat_g}g. Trans fats are highly artificial.`, 
        severity: 'high',
        source: conditionSource
      });
      score -= 15;
    }

    if (limits.max_carbs_g && carbs > limits.max_carbs_g) {
      warnings.push({ 
        ingredient: 'Carbohydrates', 
        reason: `Exceeds your ${formattedCondition} limit of ${limits.max_carbs_g}g.`, 
        severity: 'medium',
        source: conditionSource
      });
      score -= 10;
    }

    if (limits.max_calories_kcal && calories > limits.max_calories_kcal) {
      warnings.push({ 
        ingredient: 'Calories', 
        reason: `Exceeds your ${formattedCondition} limit of ${limits.max_calories_kcal} kcal per serving.`, 
        severity: 'medium',
        source: conditionSource
      });
      score -= 10;
    }

    if (limits.max_cholesterol_mg && cholesterol > limits.max_cholesterol_mg) {
      warnings.push({ 
        ingredient: 'Cholesterol', 
        reason: `Exceeds your ${formattedCondition} limit of ${limits.max_cholesterol_mg}mg.`, 
        severity: 'medium',
        source: conditionSource
      });
      score -= 10;
    }

    if (protein < (limits.min_protein_g || 0) && protein > 0) {
       // Not a warning, just context or slight deduction if it's meant to be high protein
    }
  });

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
