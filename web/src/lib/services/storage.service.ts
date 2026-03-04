import {
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName, getR2PublicUrl } from '@/lib/clients/r2';

export interface UploadResult {
  url: string;
  key: string;
  expiresAt: Date;
}

const TTL_MS = 24 * 60 * 60 * 1000;

export async function uploadUserImage(
  buffer: Buffer,
  storeApiKey: string,
  originalFileName: string,
  mimeType: string,
): Promise<UploadResult> {
  const r2 = getR2Client();
  const bucket = getR2BucketName();
  const publicUrl = getR2PublicUrl();

  const sanitizedName = originalFileName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.\-_]/g, '');
  const timestamp = Date.now();
  const key = `uploads/${storeApiKey}/${timestamp}-${sanitizedName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  return {
    url: `${publicUrl}/${key}`,
    key,
    expiresAt: new Date(timestamp + TTL_MS),
  };
}

export async function deleteImage(key: string): Promise<void> {
  const r2 = getR2Client();
  const bucket = getR2BucketName();

  await r2.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  );
}

export async function deleteImages(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  const r2 = getR2Client();
  const bucket = getR2BucketName();

  const chunks = chunkArray(keys, 1000);
  let deleted = 0;

  for (const chunk of chunks) {
    const result = await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      }),
    );
    deleted += result.Deleted?.length ?? 0;
  }

  return deleted;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
