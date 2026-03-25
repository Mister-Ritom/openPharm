"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProduct = analyzeProduct;
const harmfulIngredients_json_1 = __importDefault(require("../data/harmfulIngredients.json"));
const nutritionalThresholds_json_1 = __importDefault(require("../data/nutritionalThresholds.json"));
const HARMFUL_LIST = harmfulIngredients_json_1.default;
const THRESHOLDS = nutritionalThresholds_json_1.default;
function analyzeProduct(data, userProfile) {
    const warnings = [];
    let score = 100;
    const userConditions = userProfile?.healthProfiles || ['general'];
    if (data.ingredients) {
        data.ingredients.forEach(ing => {
            const ingLower = ing.toLowerCase();
            const found = HARMFUL_LIST.find(h => ingLower.includes(h.name.toLowerCase()) ||
                h.aliases.some(a => ingLower.includes(a.toLowerCase())) ||
                (h.eNumber && ingLower.includes(h.eNumber.toLowerCase())));
            if (found) {
                const isHarmfulForUser = found.harmfulFor.some(c => userConditions.includes(c));
                if (isHarmfulForUser) {
                    warnings.push({
                        ingredient: found.name,
                        reason: found.description,
                        severity: found.severity
                    });
                    // Weight score reduction by severity
                    if (found.severity === 'high')
                        score -= 25;
                    else if (found.severity === 'medium')
                        score -= 15;
                    else
                        score -= 5;
                }
            }
        });
    }
    // Nutritional penalties ("Dosage" checks)
    const sugar = data.nutrients?.sugar_g || 0;
    const sodium = data.nutrients?.sodium_mg || 0;
    const satFat = data.nutrients?.fat_g || 0; // Simplified fat check as Sat Fat might missing
    const protein = data.nutrients?.protein_g || 0;
    userConditions.forEach((condition) => {
        const limits = THRESHOLDS[condition] || THRESHOLDS.general;
        if (sugar > limits.max_sugar_g) {
            warnings.push({
                ingredient: 'Sugar',
                reason: `Exceeds your ${condition} limit of ${limits.max_sugar_g}g. High sugar spikes insulin.`,
                severity: 'high'
            });
            score -= 20;
        }
        if (sodium > limits.max_sodium_mg) {
            warnings.push({
                ingredient: 'Sodium',
                reason: `Exceeds your ${condition} limit of ${limits.max_sodium_mg}mg. Increases blood pressure.`,
                severity: 'medium'
            });
            score -= 10;
        }
        if (satFat > (limits.max_sat_fat_g || 10)) {
            warnings.push({
                ingredient: 'Fat',
                reason: `Exceeds your ${condition} recommended fat limit.`,
                severity: 'low'
            });
            score -= 5;
        }
        if (protein < (limits.min_protein_g || 0) && protein > 0) {
            // Not a warning, just context or slight deduction if it's meant to be high protein
        }
    });
    let grade = 'C';
    if (score >= 90)
        grade = 'A';
    else if (score >= 70)
        grade = 'B';
    else if (score >= 50)
        grade = 'C';
    else if (score >= 30)
        grade = 'D';
    else
        grade = 'E';
    return {
        ...data,
        healthScore: Math.max(0, score),
        warnings,
        grade
    };
}
//# sourceMappingURL=analysisEngine.js.map