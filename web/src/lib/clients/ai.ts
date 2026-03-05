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
    ? `A primeira imagem é a foto do usuário. A segunda imagem é o produto (roupa/acessório).

Instruções obrigatórias:
1. CONSISTÊNCIA FÍSICA: Preserve integralmente o biotipo, estrutura corporal e peso do usuário. Se a pessoa for magra, o resultado deve mostrar uma pessoa magra; se for plus-size, deve mostrar plus-size. Não altere o corpo da pessoa em nenhuma hipótese.
2. PRODUTO COMPLETO: Exiba sempre o produto na íntegra. Se a foto do usuário for cortada (ex: mostra só até a cintura), componha naturalmente a parte faltante para que o produto apareça completo, preservando o estilo fotográfico e o fundo originais.
3. CAIMENTO NATURAL: Adapte o caimento da peça à forma corporal real do usuário. Uma roupa solta ou ampla no produto original não deve aparecer justa. Mantenha fielmente o estilo da peça (oversized, reto, fluido, justo, etc.).
4. IDENTIDADE PRESERVADA: Preserve EXATAMENTE o rosto, expressão, pose, fundo e iluminação originais da foto do usuário.
5. Retorne APENAS a imagem resultante, sem texto, marca d'água ou qualquer elemento extra.`
    : `A imagem enviada é a foto do usuário. Vista o produto que aparece na cena ao usuário de forma fotorrealista.

Instruções obrigatórias:
1. CONSISTÊNCIA FÍSICA: Preserve integralmente o biotipo, estrutura corporal e peso do usuário. Não altere o corpo da pessoa em nenhuma hipótese.
2. PRODUTO COMPLETO: Exiba o produto na íntegra, compondo naturalmente a cena se a foto estiver cortada.
3. CAIMENTO NATURAL: Adapte o caimento ao corpo real do usuário, mantendo fiel o estilo original da peça.
4. IDENTIDADE PRESERVADA: Preserve EXATAMENTE o rosto, expressão, pose, fundo e iluminação originais.
5. Retorne APENAS a imagem resultante, sem texto, marca d'água ou qualquer elemento extra.`;

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
