import { NextRequest, NextResponse } from 'next/server';
import {
  getExpiredSessions,
  markSessionsImageDeleted,
} from '@/lib/services/session.service';
import { deleteImages } from '@/lib/services/storage.service';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[Cleanup] CRON_SECRET não configurado.');
    return NextResponse.json({ error: 'Serviço não disponível.' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    console.info('[Cleanup] Iniciando limpeza de imagens expiradas...');

    const expired = await getExpiredSessions(200);

    if (expired.length === 0) {
      console.info('[Cleanup] Nenhuma sessão expirada encontrada.');
      return NextResponse.json({ deleted: 0, sessions: 0 });
    }

    const keys = expired
      .map((s: { id: string; original_image_key: string }) => s.original_image_key)
      .filter(Boolean);

    const deletedCount = await deleteImages(keys);

    await markSessionsImageDeleted(expired.map((s: { id: string; original_image_key: string }) => s.id));

    console.info(
      `[Cleanup] Concluído: ${deletedCount} imagens deletadas, ${expired.length} sessões marcadas.`,
    );

    return NextResponse.json({
      deleted: deletedCount,
      sessions: expired.length,
    });
  } catch (err: unknown) {
    console.error(
      '[Cleanup] Falha:',
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: 'Falha na limpeza.' }, { status: 500 });
  }
}
