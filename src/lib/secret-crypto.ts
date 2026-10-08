/**
 * Chiffrement au repos des secrets stockés en base (identifiants ASP/TTN, SFTP…).
 *
 * - AES-256-GCM (node:crypto), clé de 32 octets en base64 dans ASP_ENCRYPTION_KEY.
 * - Format stocké : "enc:v1:<iv base64>:<tag base64>:<chiffré base64>" (iv 12 octets, tag 16 octets).
 * - Rétro-compatible : une valeur sans préfixe "enc:v1:" est considérée comme du texte clair
 *   historique et renvoyée telle quelle par decryptSecret (voir scripts/reencrypt-asp-config.ts).
 * - Fail closed : chiffrer (ou déchiffrer une valeur chiffrée) sans clé valide lève une erreur ;
 *   on n'écrit jamais un secret en clair « faute de clé ».
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

export const ENC_PREFIX = 'enc:v1:'
const IV_LENGTH = 12
const TAG_LENGTH = 16

export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EncryptionKeyError'
  }
}

export function getEncryptionKey(raw: string | undefined = process.env.ASP_ENCRYPTION_KEY): Buffer {
  if (!raw || !raw.trim()) {
    throw new EncryptionKeyError('ASP_ENCRYPTION_KEY manquante : impossible de chiffrer/déchiffrer les identifiants ASP/TTN.')
  }
  const key = Buffer.from(raw.trim(), 'base64')
  if (key.length !== 32) {
    throw new EncryptionKeyError(`ASP_ENCRYPTION_KEY doit faire 32 octets encodés en base64 (reçu ${key.length} octets).`)
  }
  return key
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX)
}

/** Chiffre une valeur. null/undefined/'' sont renvoyés tels quels ; une valeur déjà chiffrée n'est pas re-chiffrée. */
export function encryptSecret<T extends string | null | undefined>(plain: T, key: Buffer = getEncryptionKey()): T | string {
  if (plain === null || plain === undefined || plain === '') return plain
  if (isEncrypted(plain)) return plain
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH })
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

/** Déchiffre une valeur "enc:v1:…". Une valeur sans préfixe (clair historique) est renvoyée telle quelle. */
export function decryptSecret<T extends string | null | undefined>(value: T, key?: Buffer): T | string {
  if (value === null || value === undefined || value === '') return value
  if (!isEncrypted(value)) return value
  const parts = value.slice(ENC_PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('Secret chiffré mal formé')
  const [ivB64, tagB64, ctB64] = parts
  const decipher = createDecipheriv('aes-256-gcm', key ?? getEncryptionKey(), Buffer.from(ivB64, 'base64'), {
    authTagLength: TAG_LENGTH,
  })
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8')
}

// ─── ASPConfiguration ─────────────────────────────────────────────────────────

/** Champs secrets de ASPConfiguration chiffrés au repos. */
export const ASP_SECRET_FIELDS = ['apiKey', 'apiSecret', 'sftpPassword', 'webhookSecret'] as const
type AspSecretField = (typeof ASP_SECRET_FIELDS)[number]

/** Chiffre les champs secrets présents (les autres clés sont recopiées telles quelles). */
export function encryptAspSecrets<T extends Partial<Record<AspSecretField, string | null | undefined>>>(data: T): T {
  const key = getEncryptionKey()
  const out: Record<string, unknown> = { ...data }
  for (const f of ASP_SECRET_FIELDS) {
    if (f in out) out[f] = encryptSecret(out[f] as string | null | undefined, key)
  }
  return out as T
}

/** Déchiffre les champs secrets d'une ligne ASPConfiguration (clair historique accepté). */
export function decryptAspConfig<T extends Partial<Record<AspSecretField, string | null>>>(row: T): T {
  const out: Record<string, unknown> = { ...row }
  const needsKey = ASP_SECRET_FIELDS.some((f) => isEncrypted(out[f] as string | null | undefined))
  const key = needsKey ? getEncryptionKey() : undefined
  for (const f of ASP_SECRET_FIELDS) {
    if (f in out) out[f] = decryptSecret(out[f] as string | null | undefined, key)
  }
  return out as T
}
