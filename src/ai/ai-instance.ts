import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  promptDir: './prompts',
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
      // Optional: Specify API version if needed, e.g., 'v1beta' for certain features
      // apiVersion: 'v1beta',
    }),
  ],
  // Use a model known for good multimodal capabilities like Gemini 1.5 Flash
  model: 'googleai/gemini-1.5-flash',
  // Allow experimental models if needed, but prefer stable ones.
  // May need specific models like gemini-pro-vision for image input depending on GA release status
  // model: 'googleai/gemini-pro-vision', // Older vision model
});
