'use server';

/**
 * @fileOverview Analyzes user-provided symptoms, age, and medical history to provide a list of possible diagnoses.
 *
 * - analyzeSymptoms - A function that handles the symptom analysis process.
 * - AnalyzeSymptomsInput - The input type for the analyzeSymptoms function.
 * - AnalyzeSymptomsOutput - The return type for the analyzeSymptoms function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {Diagnosis, getDiagnosis, MedicalHistory, Symptom} from '@/services/medical-diagnosis';

const AnalyzeSymptomsInputSchema = z.object({
  age: z.number().int().positive().describe('The age of the user.'),
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
      age: z.number().int().positive().describe('The age of the user.'), // Added age to prompt input
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
  // Updated prompt to include age
  prompt: `Based on the following information, provide a list of possible diagnoses ranked by likelihood.\n\nAge: {{age}}\n\nSymptoms:\n{{#each symptoms}}\n- {{this.name}} (Severity: {{this.severity}})\n{{/each}}\n\nMedical History:\n- Past Conditions: {{#each medicalHistory.pastConditions}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}\n- Current Medications: {{#each medicalHistory.currentMedications}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}\n\nDiagnoses: `,
});

const analyzeSymptomsFlow = ai.defineFlow<
  typeof AnalyzeSymptomsInputSchema,
  typeof AnalyzeSymptomsOutputSchema
>({
  name: 'analyzeSymptomsFlow',
  inputSchema: AnalyzeSymptomsInputSchema,
  outputSchema: AnalyzeSymptomsOutputSchema,
}, async input => {
  // Call the external getDiagnosis API, now passing age as well.
  const diagnoses: Diagnosis[] = await getDiagnosis(input.age, input.symptoms, input.medicalHistory);
  // Format the diagnoses to conform with the schema.
  // In a real scenario, the prompt call might happen here, using the diagnoses from the service as context or validation.
  // For this example, we'll return the service response directly.
  // const {output} = await prompt(input);
  // return output!;
  return { diagnoses };
});
