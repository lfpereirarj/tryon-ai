import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  TryOnGenerationRequestSchema,
  validateImageFile,
} from '@/lib/contracts/v1';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import {
  findStoreByApiKey,
  createTryOnSession,
} from '@/lib/services/session.service';
import { uploadUserImage } from '@/lib/services/storage.service';
import { generateVirtualTryOn } from '@/lib/clients/ai';
import { isSkuEnabled } from '@/lib/services/catalog.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type ValidMimeType = (typeof VALID_MIME_TYPES)[number];

function normalizeMime(raw: string | null | undefined): ValidMimeType {
  const base = (raw ?? '').split(';')[0].trim().toLowerCase();
  return (VALID_MIME_TYPES as readonly string[]).includes(base)
    ? (base as ValidMimeType)
    : 'image/jpeg';
}

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    {
      error: message,
      ...(IS_PRODUCTION ? {} : { details }),
    },
    { status },
  );
}

function buildCorsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return safeError('Payload inválido.', 400);
  }

  const rawFields = {
    storeApiKey: formData.get('storeApiKey'),
    sessionId: formData.get('sessionId'),
    skuId: formData.get('skuId'),
    productImageUrl: formData.get('productImageUrl') ?? undefined,
  };

  let parsed: ReturnType<typeof TryOnGenerationRequestSchema.parse>;
  try {
    parsed = TryOnGenerationRequestSchema.parse(rawFields);
  } catch (err) {
    if (err instanceof ZodError) {
      return safeError(
        'Parâmetros inválidos.',
        400,
        err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      );
    }
    return safeError('Parâmetros inválidos.', 400);
  }

  const imageFile = formData.get('image');
  if (!(imageFile instanceof File)) {
    return safeError('Campo "image" é obrigatório.', 400);
  }

  const imgValidation = validateImageFile(imageFile);
  if (!imgValidation.valid) {
    return safeError(imgValidation.error ?? 'Imagem inválida.', 400);
  }

  const store = await findStoreByApiKey(parsed.storeApiKey);
  if (!store) {
    // Mensagem genérica para não vazar se a chave existe ou não
    return safeError('Requisição inválida.', 400);
  }

  if (store.status === 'suspended' || store.status === 'cancelled') {
    return new NextResponse(null, { status: 403 });
  }

  if (origin && !isOriginAllowed(origin, store.allowed_origins)) {
    return new NextResponse(null, { status: 403 });
  }

  // Guard: SKU deve estar habilitado no catálogo (se existir restrição)
  const skuAllowed = await isSkuEnabled(store.id, parsed.skuId);
  if (!skuAllowed) {
    return new NextResponse(
      JSON.stringify({ error: 'SKU não elegível para try-on.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const corsHeaders = buildCorsHeaders(origin);

  const rateLimit = checkRateLimit(parsed.storeApiKey);
  if (!rateLimit.allowed) {
    return new NextResponse(
      JSON.stringify({ error: 'Limite de requisições atingido.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.retryAfter),
          ...corsHeaders,
        },
      },
    );
  }

  try {
    const startTime = Date.now();

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await uploadUserImage(
      buffer,
      parsed.storeApiKey,
      imageFile.name || 'photo.jpg',
      imageFile.type,
    );
    console.info(`[STORAGE] Imagem salva: ${uploadResult.url}`);

    let productBuffer: Buffer | undefined;
    let productMimeType: string | undefined;
    if (parsed.productImageUrl) {
      try {
        const productRes = await fetch(parsed.productImageUrl);
        if (productRes.ok) {
          productBuffer = Buffer.from(await productRes.arrayBuffer());
          productMimeType = productRes.headers.get('content-type') ?? 'image/jpeg';
        }
      } catch {
        console.warn('[Pipeline] Não foi possível baixar imagem do produto — seguindo sem ela.');
      }
    }

    const generatedBase64 = await generateVirtualTryOn(
      buffer,
      normalizeMime(imageFile.type),
      productBuffer,
      productMimeType ? normalizeMime(productMimeType) : undefined,
    );
    const generationTimeMs = Date.now() - startTime;
    console.info(`[IA] Concluído em ${generationTimeMs}ms`);

    createTryOnSession({
      storeId: store.id,
      sessionId: parsed.sessionId,
      skuId: parsed.skuId,
      originalImagePath: uploadResult.url,
      originalImageKey: uploadResult.key,
      generationTimeMs,
      expiresAt: uploadResult.expiresAt,
    }).catch((err: unknown) => {
      console.error(
        '[Session] Falha ao persistir (non-blocking):',
        err instanceof Error ? err.message : String(err),
      );
    });

    return NextResponse.json(
      {
        success: true,
        generatedImageBase64: `data:image/jpeg;base64,${generatedBase64}`,
        generationTimeMs,
      },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[Pipeline] Falha crítica:', detail);
    return safeError('Falha no processamento.', 500, detail);
  }
}