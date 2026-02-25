import { SurveyResponse } from '../types';

// Backend API URL - use environment variable or default to localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// PDF Specific Options
const ZIP_CODES = ['95112', '95116', '95122', '95110', '95133', '95020', '95111', '95127', '95148', '95123'];

const FOOD_CATEGORIES = [
  'Fresh fruits/vegetables',
  'Meat/eggs/milk',
  'Foods from my culture',
  'Organic food',
  'Food for my health problem (like diabetes)',
  'Baby food/formula'
];

const KNOWLEDGE_TOPICS = [
  'Preparing healthy meals',
  'Preparing culturally-relevant meals',
  'Health benefits of nutritious food',
  'Health benefits of organic food',
  'Growing my own food'
];

const INCOME_RANGES = [
  'Under $50,000',
  '$50,000 - $99,000',
  '$100,000 - $150,000',
  '$150,000 - $200,000',
  '$200,000 or more',
  'Prefer not to say'
];

const AGE_RANGES = ['Under 20', '20-39', '40-59', 'Over 60', 'Prefer not to say'];

const ETHNICITIES = [
  'Hispanic or Latine', 
  'Asian / Pacific Islander', 
  'Black or African American', 
  'White', 
  'Native American or American Indian', 
  'Prefer not to say'
];

const FUTURE_OUTLOOKS = [
  'More concerned about getting food or getting the right type of food',
  'Equally concerned about getting food or getting the right type of food',
  'Less concerned about getting food or getting the right type of food',
  'Unsure'
];

// Fetch summary data from backend
export async function fetchSummaryData() {
  try {
    const response = await fetch(`${API_URL}/api/summary`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch summary data:', error);
    throw error;
  }
}

// Helper to get random item
const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random subset of an array
const randomSubset = <T,>(arr: T[], maxItems: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, randomInt(0, maxItems));
};

export const generateMockData = (count: number): SurveyResponse[] => {
  return Array.from({ length: count }).map((_, i) => {
    
    // 1. Demographics
    const income = randomItem(INCOME_RANGES);
    const age = randomItem(AGE_RANGES);
    const householdSize = randomInt(1, 6);
    
    // 2. Correlation Logic (Lower income = Higher Worry)
    let baseWorry = 0;
    if (income === 'Under $50,000') baseWorry = randomInt(3, 5);
    else if (income === '$50,000 - $99,000') baseWorry = randomInt(2, 4);
    else baseWorry = randomInt(1, 3);
    
    const worryLevel = Math.min(5, Math.max(1, baseWorry));
    
    // 3. Barriers (Correlated to Worry)
    // High worry people have more affordability issues
    const numAffordIssues = worryLevel >= 4 ? randomInt(2, 5) : randomInt(0, 2);
    const affordabilityBarriers = randomSubset(FOOD_CATEGORIES, numAffordIssues);
    
    // Availability issues are somewhat random but often link to "Culture" or "Health"
    const numAvailIssues = randomInt(0, 3);
    const availabilityBarriers = randomSubset(FOOD_CATEGORIES, numAvailIssues);
    
    // 4. Knowledge (Correlated to "Growing my own food" for Valley Verde demographic)
    const knowledgeInterests = randomSubset(KNOWLEDGE_TOPICS, randomInt(1, 4));

    // 5. Outlook
    let outlook = 'Unsure';
    if (worryLevel >= 4) outlook = FUTURE_OUTLOOKS[0]; // More concerned
    else if (worryLevel === 3) outlook = FUTURE_OUTLOOKS[1]; // Equally
    else outlook = FUTURE_OUTLOOKS[2]; // Less
    
    // 6. Qualitative
    const notes = [
      "I need gluten-free boxes.", 
      "I would love to learn to garden.", 
      "The store is too far.", 
      "Prices are too high for eggs.", 
      ""
    ];

    const timestamp = new Date(Date.now() - randomInt(0, 60) * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `RES-${1000 + i}`,
      timestamp,
      zipCode: randomItem(ZIP_CODES),
      email: Math.random() > 0.5 ? `user${i}@example.com` : undefined,
      verified: Math.random() > 0.5,
      worryLevel,
      futureOutlook: outlook,
      affordabilityBarriers,
      availabilityBarriers,
      knowledgeInterests,
      otherNotes: randomItem(notes),
      ageRange: age,
      gender: randomItem(['Female', 'Male', 'Non-binary / Gender expansive', 'Prefer not to say']),
      ethnicity: [randomItem(ETHNICITIES)], // Keeping simple for mock
      householdSize,
      incomeRange: income,
      crisisAlert: worryLevel >= 4
    };
  });
};

export const MOCK_DATA = generateMockData(120);