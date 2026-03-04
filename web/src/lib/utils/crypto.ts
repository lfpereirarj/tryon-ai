/**
 * crypto.ts — Criptografia simétrica AES-256-GCM para segredos em banco
 *
 * Variável de ambiente obrigatória:
 *   ENCRYPTION_KEY — 64 caracteres hex (32 bytes)
 *
 * Gerar uma chave segura:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Formato do valor cifrado (tudo hex):
 *   "<iv_hex>:<ciphertext_hex>:<auth_tag_hex>"
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96 bits — tamanho recomendado para GCM
const TAG_LEN = 16; // 128 bits

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length !== 64) {
    throw new Error(
      '[crypto] ENCRYPTION_KEY deve ser um hex de 64 chars (32 bytes). ' +
        'Gere com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(raw, 'hex');
}

/**
 * Cifra uma string em AES-256-GCM.
 * @returns "<iv_hex>:<ciphertext_hex>:<auth_tag_hex>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decifra um valor gerado por `encrypt()`.
 * @throws Se o formato for inválido ou a autenticação falhar.
 */
export function decrypt(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) {
    throw new Error('[crypto] Formato inválido: esperado "iv:ciphertext:tag".');
  }

  const [ivHex, cipherHex, tagHex] = parts as [string, string, string];
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  if (iv.length !== IV_LEN) {
    throw new Error('[crypto] IV com tamanho inválido.');
  }
  if (tag.length !== TAG_LEN) {
    throw new Error('[crypto] Auth tag com tamanho inválido.');
  }

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Mascara um segredo para exibição: mostra apenas os primeiros 4 chars.
 * Ex: "xG9k••••••••••••"
 */
export function maskSecret(value: string): string {
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 4)}${'•'.repeat(Math.min(12, value.length - 4))}`;
}
