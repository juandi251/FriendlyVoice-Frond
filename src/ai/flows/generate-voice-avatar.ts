// GenerateVoiceAvatar flow to create a voice avatar based on user's voice sample.
// It takes voice data URI as input and returns an image data URI.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVoiceAvatarInputSchema = z.object({
  voiceDataUri: z
    .string()
    .describe(
      'A voice recording of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type GenerateVoiceAvatarInput = z.infer<typeof GenerateVoiceAvatarInputSchema>;

const GenerateVoiceAvatarOutputSchema = z.object({
  avatarDataUri: z.string().describe('The generated avatar image as a data URI.'),
});
export type GenerateVoiceAvatarOutput = z.infer<typeof GenerateVoiceAvatarOutputSchema>;

export async function generateVoiceAvatar(
  input: GenerateVoiceAvatarInput
): Promise<GenerateVoiceAvatarOutput> {
  return generateVoiceAvatarFlow(input);
}

const generateVoiceAvatarPrompt = ai.definePrompt({
  name: 'generateVoiceAvatarPrompt',
  input: {schema: GenerateVoiceAvatarInputSchema},
  output: {schema: GenerateVoiceAvatarOutputSchema},
  prompt: `Eres un generador de avatares IA. Recibirás una muestra de voz del usuario y, basándote en esta muestra de voz, generarás un avatar único para representarlo. El avatar debe ser abstracto y visualmente atractivo. La salida debe ser un URI de datos que represente la imagen. Usa colores verde azulado (#008080) y azul en el avatar.

Muestra de Voz: {{media url=voiceDataUri}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const generateVoiceAvatarFlow = ai.defineFlow(
  {
    name: 'generateVoiceAvatarFlow',
    inputSchema: GenerateVoiceAvatarInputSchema,
    outputSchema: GenerateVoiceAvatarOutputSchema,
  },
  async input => {
    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: [
        {media: {url: input.voiceDataUri}},
        {
          text:
            'Genera un avatar único, abstracto y visualmente atractivo que represente esta voz. Usa colores verde azulado (#008080) y azul en el avatar.',
        },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const url = result.media?.url;
    if (!url) {
      throw new Error('No se recibió media/url del modelo al generar el avatar.');
    }
    return {avatarDataUri: url};
  }
);
