import { S3Client } from '@aws-sdk/client-s3';

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[R2] R2_ENDPOINT, R2_ACCESS_KEY_ID ou R2_SECRET_ACCESS_KEY não configurados.',
    );
  }

  _r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _r2Client;
}

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('[R2] R2_BUCKET_NAME não configurado.');
  return bucket;
}

export function getR2PublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!url) throw new Error('[R2] NEXT_PUBLIC_R2_PUBLIC_URL não configurado.');
  return url;
}
