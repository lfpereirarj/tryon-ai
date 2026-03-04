import { GoogleGenAI, Part } from '@google/genai';

let _client: GoogleGenAI | null = null;

const CURRENT_MODEL = 'gemini-3.1-flash-image-preview';

function getClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[AI] GEMINI_API_KEY não configurada.');
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

export async function generateVirtualTryOn(
  userImageBuffer: Buffer,
  mimeType: string,
  productImageBuffer?: Buffer,
  productMimeType?: string,
): Promise<string> {
  const client = getClient();

  const prompt = productImageBuffer
    ? 'A primeira imagem é a foto do usuário. A segunda imagem é o produto (roupa/acessório). Vista o produto da segunda imagem ao usuário de forma fotorrealista. Preserve EXATAMENTE a identidade, rosto, pose, fundo e iluminação originais. Adapte o tamanho e caimento da peça ao corpo com naturalidade profissional. Retorne APENAS a imagem resultante.'
    : 'A imagem enviada é a foto do usuário. Vista o produto que aparece na cena ao usuário de forma fotorrealista. Preserve EXATAMENTE a identidade, rosto, pose, fundo e iluminação originais. Retorne APENAS a imagem resultante.';

  const parts: Part[] = [
    { text: prompt },
    { inlineData: { data: userImageBuffer.toString('base64'), mimeType } },
    ...(productImageBuffer && productMimeType
      ? [{ inlineData: { data: productImageBuffer.toString('base64'), mimeType: productMimeType } } as Part]
      : []),
  ];

  const response = await client.models.generateContent({
    model: CURRENT_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.mimeType?.startsWith('image/'),
  );

  if (!imagePart?.inlineData?.data) {
    const finishReason = response.candidates?.[0]?.finishReason ?? 'UNKNOWN';
    const textPart = response.candidates?.[0]?.content?.parts?.find((p) => p.text);
    throw new Error(
      `IA não retornou imagem. Motivo: ${finishReason}${textPart?.text ? ` — ${textPart.text}` : ''}`,
    );
  }

  return imagePart.inlineData.data;
}
