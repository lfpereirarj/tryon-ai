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
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const storeApiKey = searchParams.get('storeApiKey')?.trim();
  const skuId = searchParams.get('skuId')?.trim();

  // Parâmetros obrigatórios ausentes → fail-open
  if (!storeApiKey || !skuId) {
    return NextResponse.json({ eligible: true });
  }

  const store = await findStoreByApiKey(storeApiKey);

  if (!store) {
    return NextResponse.json({ eligible: false });
  }

  if (store.status === 'suspended' || store.status === 'cancelled') {
    return NextResponse.json({ eligible: false });
  }

  const eligible = await isSkuEnabled(store.id, skuId);
  return NextResponse.json({ eligible });
}
