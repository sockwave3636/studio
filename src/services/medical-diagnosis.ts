/**
 * Represents a symptom with a name and severity level.
 */
export interface Symptom {
  /**
   * The name of the symptom.
   */
  name: string;
  /**
   * The severity level of the symptom (e.g., Mild, Moderate, Severe).
   */
  severity: string;
}

/**
 * Represents medical history information.
 */
export interface MedicalHistory {
  /**
   * A list of past medical conditions.
   */
  pastConditions: string[];
  /**
   * A list of current medications.
   */
  currentMedications: string[];
}

/**
 * Represents a possible diagnosis with a condition name and confidence level.
 */
export interface Diagnosis {
  /**
   * The name of the diagnosed condition.
   */
  condition: string;
  /**
   * The confidence level of the diagnosis (e.g., High, Medium, Low).
   */
  confidence: string;
}

/**
 * Asynchronously retrieves possible diagnoses based on user-inputted age, symptoms, and medical history.
 *
 * @param age The age of the user.
 * @param symptoms A list of symptoms provided by the user.
 * @param medicalHistory The user's medical history information.
 * @returns A promise that resolves to a list of possible diagnoses.
 */
export async function getDiagnosis(age: number, symptoms: Symptom[], medicalHistory: MedicalHistory): Promise<Diagnosis[]> {
  // TODO: Implement this by calling an external API.
  // The API call should now include the age parameter.
  console.log(`Getting diagnosis for age: ${age}, symptoms:`, symptoms, 'medical history:', medicalHistory);

  // Example mock response (can be adjusted based on age or other inputs)
  const mockDiagnoses = [
    {
      condition: 'Common Cold',
      confidence: 'High',
    },
    {
      condition: 'Flu',
      confidence: 'Medium',
    },
  ];

  if (age < 18) {
    mockDiagnoses.push({
      condition: 'Pediatric Viral Infection',
      confidence: 'Low',
    });
  } else if (age > 65) {
     mockDiagnoses.push({
      condition: 'Age-related Condition Check',
      confidence: 'Low',
    });
  }


  return mockDiagnoses;
}
