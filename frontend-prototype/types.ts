export interface SurveyResponse {
  id: string;
  timestamp: string;
  zipCode: string; // Q10
  email?: string; // Optional Name/Contact
  verified: boolean;
  
  // Section 1: Food Security & Outlook
  worryLevel: number; // Q2: 1-5 (Not worried to Extremely worried)
  futureOutlook: string; // Q3: "More concerned", "Equally concerned", "Less concerned", "Unsure"
  
  // Section 2: Barriers (The Gap Analysis)
  affordabilityBarriers: string[]; // Q4: "I have trouble affording..."
  availabilityBarriers: string[]; // Q5: "I have trouble finding..."
  
  // Section 3: Education
  knowledgeInterests: string[]; // Q6: "I would like more knowledge about..."
  
  // Section 4: Qualitative
  otherNotes: string; // Q7: Open text
  
  // Section 5: Demographics
  ageRange: string; // Q8: Under 20, 20-39, 40-59, Over 60
  gender: string; // Q9
  ethnicity: string[]; // Q10 (Select all that apply)
  householdSize: number; // Q11: 1-6
  incomeRange: string; // Q12: Specific PDF ranges
  
  // Derived
  crisisAlert: boolean; // Derived from worryLevel 4-5
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export type TimeFilter = 'week' | 'month' | 'quarter' | 'all';