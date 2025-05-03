'use server';

/**
 * @fileOverview Analyzes user-provided symptoms, profile, medical history, and optional medical images (MRI/X-ray) to provide a list of possible diagnoses.
 *
 * - analyzeSymptoms - A function that handles the symptom analysis process.
 * - AnalyzeSymptomsInput - The input type for the analyzeSymptoms function.
 * - AnalyzeSymptomsOutput - The return type for the analyzeSymptoms function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {Diagnosis, getDiagnosis, MedicalHistory, PatientProfile, Symptom} from '@/services/medical-diagnosis';

// Schema for the data the *flow* receives externally
const AnalyzeSymptomsInputSchema = z.object({
  name: z.string().describe('The name of the user.'),
  age: z.number().int().positive().describe('The age of the user.'),
  weight: z.number().positive().optional().describe('The weight of the user.'),
  weightUnit: z.string().optional().describe('The unit for the weight (e.g., kg, lbs).'),
  height: z.number().positive().optional().describe('The height of the user.'),
  heightUnit: z.string().optional().describe('The unit for the height (e.g., cm, in).'),
  gender: z.string().describe('The gender of the user.'),
  symptoms: z
    .array(z.object({
      name: z.string().describe('The name of the symptom.'),
      severity: z.string().describe('The severity level of the symptom (e.g., Mild, Moderate, Severe).'),
    }))
    .describe('A list of symptoms provided by the user.'),
  medicalHistory: z
    .object({
      pastConditions: z.array(z.string()).describe('A list of past medical conditions.'),
      currentMedications: z.array(z.string()).describe('A list of current medications.'),
    })
    .describe('The user\'s medical history information.'),
   imageDataUri: z.string().optional().describe(
      "Optional medical image (like MRI or X-ray) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeSymptomsInput = z.infer<typeof AnalyzeSymptomsInputSchema>;

// Schema for the data the *flow* outputs
const AnalyzeSymptomsOutputSchema = z.object({
  diagnoses: z
    .array(z.object({
      condition: z.string().describe('The name of the diagnosed condition.'),
      confidence: z.string().describe('The confidence level of the diagnosis (e.g., High, Medium, Low).'),
    }))
    .describe('A list of possible diagnoses, ranked by likelihood.'),
});
export type AnalyzeSymptomsOutput = z.infer<typeof AnalyzeSymptomsOutputSchema>;

// Schema for the data structure expected by the *prompt* (with pre-processed history)
const PromptInputSchema = AnalyzeSymptomsInputSchema.omit({ medicalHistory: true }).extend({
    medicalHistory: z.object({
        pastConditionsString: z.string().describe('Comma-separated list of past medical conditions.'),
        currentMedicationsString: z.string().describe('Comma-separated list of current medications.'),
    })
});
type PromptInput = z.infer<typeof PromptInputSchema>;


export async function analyzeSymptoms(input: AnalyzeSymptomsInput): Promise<AnalyzeSymptomsOutput> {
  return analyzeSymptomsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSymptomsPrompt',
  input: {
    schema: PromptInputSchema, // Use the schema with pre-processed strings
  },
  output: {
    schema: AnalyzeSymptomsOutputSchema, // Use the existing output schema
  },
  // Updated prompt to use pre-joined strings and handle optional fields correctly
  prompt: `You are a medical AI assistant. Analyze the following information for patient {{name}} to provide a list of possible diagnoses ranked by likelihood. Consider the symptoms, medical history, and the provided medical image (if any).

Profile:
- Name: {{name}}
- Age: {{age}}
- Gender: {{gender}}{{#if weight}}
- Weight: {{weight}} {{weightUnit}}{{/if}}{{#if height}}
- Height: {{height}} {{heightUnit}}{{/if}}

Symptoms:
{{#each symptoms}}
- {{this.name}} (Severity: {{this.severity}})
{{/each}}

Medical History:
- Past Conditions: {{medicalHistory.pastConditionsString}}
- Current Medications: {{medicalHistory.currentMedicationsString}}

{{#if imageDataUri}}
Medical Image Analysis:
Please analyze the provided medical image (MRI, X-ray, etc.) for any abnormalities or relevant findings.
Image: {{media url=imageDataUri}}
{{else}}
No medical image provided.
{{/if}}

Based on all the available information (profile, symptoms, history, and image analysis if provided), list the possible diagnoses:`,
});


const analyzeSymptomsFlow = ai.defineFlow<
  typeof AnalyzeSymptomsInputSchema,
  typeof AnalyzeSymptomsOutputSchema
>({
  name: 'analyzeSymptomsFlow',
  inputSchema: AnalyzeSymptomsInputSchema,
  outputSchema: AnalyzeSymptomsOutputSchema,
}, async (input: AnalyzeSymptomsInput): Promise<AnalyzeSymptomsOutput> => {

  // Pre-process medical history arrays into comma-separated strings for the prompt
  const processedInputForPrompt: PromptInput = {
    ...input, // Spread original input (name, age, gender, symptoms, imageDataUri, weight, height etc.)
    medicalHistory: { // Replace medicalHistory object with the string versions
      pastConditionsString: input.medicalHistory.pastConditions.join(', ').trim() || 'None reported',
      currentMedicationsString: input.medicalHistory.currentMedications.join(', ').trim() || 'None reported',
    },
  };

  // Call the Genkit prompt with the processed input matching PromptInputSchema
  const {output} = await prompt(processedInputForPrompt);

  // Optionally, you could still call the external service for non-image related diagnosis components
  // and potentially combine the results, but for simplicity, we rely on the prompt for now.
  /*
  const profile: PatientProfile = {
      name: input.name,
      age: input.age,
      weight: input.weight,
      weightUnit: input.weightUnit,
      height: input.height,
      heightUnit: input.heightUnit,
      gender: input.gender,
  };
  const serviceDiagnoses: Diagnosis[] = await getDiagnosis(profile, input.symptoms, input.medicalHistory);
  */

  // Return the diagnoses generated by the AI prompt
  return output!; // Output should conform to AnalyzeSymptomsOutputSchema
});
