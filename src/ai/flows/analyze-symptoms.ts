'use server';

/**
 * @fileOverview Analyzes user-provided symptoms, profile, and medical history to provide a list of possible diagnoses.
 *
 * - analyzeSymptoms - A function that handles the symptom analysis process.
 * - AnalyzeSymptomsInput - The input type for the analyzeSymptoms function.
 * - AnalyzeSymptomsOutput - The return type for the analyzeSymptoms function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {Diagnosis, getDiagnosis, MedicalHistory, PatientProfile, Symptom} from '@/services/medical-diagnosis';

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
});
export type AnalyzeSymptomsInput = z.infer<typeof AnalyzeSymptomsInputSchema>;

const AnalyzeSymptomsOutputSchema = z.object({
  diagnoses: z
    .array(z.object({
      condition: z.string().describe('The name of the diagnosed condition.'),
      confidence: z.string().describe('The confidence level of the diagnosis (e.g., High, Medium, Low).'),
    }))
    .describe('A list of possible diagnoses, ranked by likelihood.'),
});
export type AnalyzeSymptomsOutput = z.infer<typeof AnalyzeSymptomsOutputSchema>;

export async function analyzeSymptoms(input: AnalyzeSymptomsInput): Promise<AnalyzeSymptomsOutput> {
  return analyzeSymptomsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSymptomsPrompt',
  input: {
    schema: z.object({
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
    }),
  },
  output: {
    schema: z.object({
      diagnoses: z
        .array(z.object({
          condition: z.string().describe('The name of the diagnosed condition.'),
          confidence: z.string().describe('The confidence level of the diagnosis (e.g., High, Medium, Low).'),
        }))
        .describe('A list of possible diagnoses, ranked by likelihood.'),
    }),
  },
  // Updated prompt to include all profile fields
  prompt: `Based on the following information for {{name}}, provide a list of possible diagnoses ranked by likelihood.\n\nProfile:\n- Age: {{age}}\n- Gender: {{gender}}{{#if weight}}\n- Weight: {{weight}} {{weightUnit}}{{/if}}{{#if height}}\n- Height: {{height}} {{heightUnit}}{{/if}}\n\nSymptoms:\n{{#each symptoms}}\n- {{this.name}} (Severity: {{this.severity}})\n{{/each}}\n\nMedical History:\n- Past Conditions: {{#if medicalHistory.pastConditions}}{{join medicalHistory.pastConditions ", "}}{{else}}None reported{{/if}}\n- Current Medications: {{#if medicalHistory.currentMedications}}{{join medicalHistory.currentMedications ", "}}{{else}}None reported{{/if}}\n\nDiagnoses: `,
});

const analyzeSymptomsFlow = ai.defineFlow<
  typeof AnalyzeSymptomsInputSchema,
  typeof AnalyzeSymptomsOutputSchema
>({
  name: 'analyzeSymptomsFlow',
  inputSchema: AnalyzeSymptomsInputSchema,
  outputSchema: AnalyzeSymptomsOutputSchema,
}, async input => {
  // Prepare profile data for the service call
  const profile: PatientProfile = {
      name: input.name,
      age: input.age,
      weight: input.weight,
      weightUnit: input.weightUnit,
      height: input.height,
      heightUnit: input.heightUnit,
      gender: input.gender,
  };

  // Call the external getDiagnosis API, passing the full profile.
  const diagnoses: Diagnosis[] = await getDiagnosis(profile, input.symptoms, input.medicalHistory);

  // Format the diagnoses to conform with the schema.
  // In a real scenario, the prompt call might happen here, using the diagnoses from the service as context or validation.
  // Or the prompt could directly generate the diagnoses if no external service is used.
  // For this example, we'll return the service response directly formatted.
  // If using the prompt to generate:
  // const {output} = await prompt(input);
  // return output!;
  return { diagnoses };
});

// Helper function for Handlebars (if not natively supported or desired)
function join(arr: string[], separator: string): string {
    return arr.join(separator);
}
// Register the helper if needed (Genkit/Handlebars setup might vary)
// Handlebars.registerHelper('join', join);
