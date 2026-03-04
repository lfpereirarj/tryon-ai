import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { TrackingEventHttpSchema } from '@/lib/contracts/v1';
import { checkRateLimit } from '@/lib/middleware/rate-limit';
import { findStoreByApiKey } from '@/lib/services/session.service';
import { insertTrackingEvent } from '@/lib/services/tracking.service';
import { processOrderEvent } from '@/lib/services/attribution.service';

const TRACKING_MAX_PER_WINDOW = 60;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    { error: message, ...(IS_PRODUCTION ? {} : { details }) },
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
  return new NextResponse(null, { status: 204, headers: buildCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError('Payload inválido.', 400);
  }

  let parsed: ReturnType<typeof TrackingEventHttpSchema.parse>;
  try {
    parsed = TrackingEventHttpSchema.parse(body);
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

  const store = await findStoreByApiKey(parsed.storeApiKey);
  if (!store) {
    return safeError('Requisição inválida.', 400);
  }

  if (origin && !isOriginAllowed(origin, store.allowed_origins)) {
    return new NextResponse(null, { status: 403 });
  }

  const corsHeaders = buildCorsHeaders(origin);

  const rateLimit = checkRateLimit(
    `tracking:${parsed.storeApiKey}`,
    TRACKING_MAX_PER_WINDOW,
  );
  if (!rateLimit.allowed) {
    return new NextResponse(JSON.stringify({ error: 'Limite de requisições atingido.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimit.retryAfter),
        ...corsHeaders,
      },
    });
  }

  try {
    await insertTrackingEvent({
      eventName: parsed.eventName,
      storeId: store.id,
      sessionId: parsed.sessionId,
      skuId: parsed.skuId,
      timestamp: parsed.timestamp,
      metadata: parsed.metadata,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[Tracking] Erro ao persistir:', detail);
    return safeError('Erro interno ao registrar evento.', 500, detail);
  }

  if (parsed.eventName === 'order_completed') {
    const meta = parsed.metadata as Record<string, unknown> | undefined;
    const orderId = typeof meta?.orderId === 'string' ? meta.orderId : '';
    const orderRevenue = typeof meta?.orderRevenue === 'number' ? meta.orderRevenue : 0;
    const currency = typeof meta?.currency === 'string' ? meta.currency : 'BRL';

    if (orderId) {
      processOrderEvent({
        storeId: store.id,
        sessionId: parsed.sessionId,
        skuId: parsed.skuId,
        orderId,
        orderRevenue,
        currency,
      }).catch((err: unknown) => {
        console.error('[Tracking] Falha ao processar influenced_order:', err);
      });
    }
  }

  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
