import harmfulIngredientsList from '../../assets/data/harmfulIngredients.json';

export type HealthProfile = 'general' | 'diabetic' | 'pcos' | 'heart' | 'child' | 'pregnant';
export type Rating = 'A' | 'B' | 'C' | 'D' | 'E';

export interface NutritionData {
  energyKcal?: number;
  totalSugarsG?: number;
  totalFatG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  proteinG?: number;
  carbohydratesG?: number;
  ingredientsList: string;
}

export interface HarmfulIngredient {
  name: string;
  aliases: string[];
  eNumber?: string;
  harmfulAbove?: string;
  harmfulFor: HealthProfile[];
  severity: 'low' | 'medium' | 'high';
  description: string;
  sources: string[];
}

export interface ProfileAnalysis {
  rating: Rating;
  primaryConcern: string | null;
  safeServingSize: string;
}

export interface AnalysisResult {
  ratings: Record<HealthProfile, ProfileAnalysis>;
  sugarTeaspoons: number;
  harmfulIngredientsFound: HarmfulIngredient[];
}

export function analyzeProduct(data: NutritionData): AnalysisResult {
  const ingredientsLower = data.ingredientsList.toLowerCase();
  
  // 1. Identify Harmful Ingredients
  const foundIngredients: HarmfulIngredient[] = [];
  for (const item of harmfulIngredientsList as HarmfulIngredient[]) {
    const isNameMatch = ingredientsLower.includes(item.name.toLowerCase());
    const isAliasMatch = item.aliases.some(alias => ingredientsLower.includes(alias.toLowerCase()));
    const isENumberMatch = item.eNumber && ingredientsLower.includes(item.eNumber.toLowerCase());
    
    if (isNameMatch || isAliasMatch || isENumberMatch) {
      foundIngredients.push(item);
    }
  }

  // 2. Sugar equivalent 
  const sugarTeaspoons = (data.totalSugarsG || 0) / 4;

  // 3. Generate Profile Ratings
  const profiles: HealthProfile[] = ['general', 'diabetic', 'pcos', 'heart', 'child', 'pregnant'];
  const ratings = {} as Record<HealthProfile, ProfileAnalysis>;

  for (const profile of profiles) {
    ratings[profile] = computeProfileRating(profile, data, foundIngredients, sugarTeaspoons);
  }

  return {
    ratings,
    sugarTeaspoons,
    harmfulIngredientsFound: foundIngredients,
  };
}

function computeProfileRating(profile: HealthProfile, data: NutritionData, foundIngredients: HarmfulIngredient[], sugarTeaspoons: number): ProfileAnalysis {
  let scorePoints = 100;
  let primaryConcern: string | null = null;
  
  // Penalize for sugar
  if (data.totalSugarsG) {
    if (profile === 'diabetic' || profile === 'pcos') {
      if (data.totalSugarsG > 5) {
        scorePoints -= 40;
        primaryConcern = "High sugar content for insulin sensitivity.";
      }
    } else if (profile === 'child') {
      if (data.totalSugarsG > 10) {
        scorePoints -= 30;
        primaryConcern = "Excessive sugar for children.";
      }
    } else {
      if (data.totalSugarsG > 15) {
        scorePoints -= 20;
        primaryConcern = "High sugar content.";
      }
    }
  }

  // Penalize for Sodium
  if (data.sodiumMg) {
    if (data.sodiumMg > 600) {
      const penalty = profile === 'heart' ? 40 : 15;
      scorePoints -= penalty;
      if (!primaryConcern || profile === 'heart') primaryConcern = "High sodium, dangerous for heart conditions.";
    }
  }

  // Penalize for Saturated Fat
  if (data.saturatedFatG) {
    if (data.saturatedFatG > 5) {
      const penalty = profile === 'heart' ? 30 : 10;
      scorePoints -= penalty;
      if (!primaryConcern || profile === 'heart') primaryConcern = "High saturated fat.";
    }
  }

  // Penalize for specific harmful ingredients
  for (const ingredient of foundIngredients) {
    if (ingredient.harmfulFor.includes(profile) || ingredient.harmfulFor.includes('general')) {
      if (ingredient.severity === 'high') scorePoints -= 30;
      else if (ingredient.severity === 'medium') scorePoints -= 15;
      else scorePoints -= 5;

      if (!primaryConcern || ingredient.severity === 'high') {
        primaryConcern = `Contains ${ingredient.name}: ${ingredient.description}`;
      }
    }
  }

  let rating: Rating = 'A';
  if (scorePoints >= 80) rating = 'A';
  else if (scorePoints >= 60) rating = 'B';
  else if (scorePoints >= 40) rating = 'C';
  else if (scorePoints >= 20) rating = 'D';
  else rating = 'E';

  // Safe serving recommendation logic
  let safeServingSize = '1 standard serving (approx 30g)';
  if (rating === 'D' || rating === 'E') {
    safeServingSize = 'Avoid if possible, or limit to 10g max.';
  } else if (rating === 'A') {
    safeServingSize = 'Free to consume moderately as part of a balanced diet.';
  }

  return { rating, primaryConcern, safeServingSize };
}
