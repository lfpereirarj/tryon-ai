import { NextRequest, NextResponse } from 'next/server';

import { findStoreByApiKey } from '@/lib/services/session.service';
import { isSkuEnabled } from '@/lib/services/catalog.service';

/**
 * GET /api/public/sku-check?storeApiKey=...&skuId=...
 *
 * Endpoint público (sem autenticação) consultado pelo widget antes de
 * renderizar a opção de try-on. Retorna { eligible: boolean }.
 *
 * Regras:
 *  - storeApiKey ou skuId ausentes  → { eligible: true }  (fail-open)
 *  - Loja não encontrada / suspensa → { eligible: false }
 *  - SKU não cadastrado no catálogo → { eligible: true }  (sem restrição)
 *  - SKU cadastrado e enabled=false → { eligible: false }
 *  - Erro de banco                  → { eligible: true }  (fail-open, igual ao isSkuEnabled)
 */

function buildCorsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.headers.get('origin') ?? '';
  const { searchParams } = new URL(request.url);
  const storeApiKey = searchParams.get('storeApiKey')?.trim();
  const skuId = searchParams.get('skuId')?.trim();

  // Parâmetros obrigatórios ausentes → fail-open
  if (!storeApiKey || !skuId) {
    return NextResponse.json({ eligible: true }, { headers: buildCorsHeaders(origin) });
  }

  const store = await findStoreByApiKey(storeApiKey);

  if (!store) {
    return NextResponse.json({ eligible: false }, { headers: buildCorsHeaders(origin) });
  }

  if (store.status === 'suspended' || store.status === 'cancelled') {
    return NextResponse.json({ eligible: false }, { headers: buildCorsHeaders(origin) });
  }

  if (origin && !isOriginAllowed(origin, store.allowed_origins)) {
    return new NextResponse(null, { status: 403, headers: buildCorsHeaders(origin) });
  }

  const eligible = await isSkuEnabled(store.id, skuId);
  return NextResponse.json({ eligible }, { headers: buildCorsHeaders(origin) });
}
