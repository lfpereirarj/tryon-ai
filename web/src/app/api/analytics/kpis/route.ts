import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { KpiRequestSchema } from '@/lib/contracts/v1';
import { findStoreByApiKey } from '@/lib/services/session.service';
import { getKpis } from '@/lib/services/analytics.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    { error: message, ...(IS_PRODUCTION ? {} : { details }) },
    { status },
  );
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? '';
  const storeApiKey = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!storeApiKey) {
    return safeError('Autenticação necessária.', 401);
  }

  const store = await findStoreByApiKey(storeApiKey);
  if (!store) {
    return safeError('Credenciais inválidas.', 401);
  }

  const { searchParams } = request.nextUrl;
  const rawFrom = searchParams.get('from');
  const rawTo = searchParams.get('to');

  let parsed: ReturnType<typeof KpiRequestSchema.parse>;
  try {
    parsed = KpiRequestSchema.parse({ from: rawFrom, to: rawTo });
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

  const kpis = await getKpis(store.id, parsed.from, parsed.to);

  return NextResponse.json(kpis);
}
