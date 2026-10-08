/**
 * Clé de signature des sessions `bello_session` (HS256).
 *
 * SÉCURITÉ : aucune valeur de repli. Si SESSION_SECRET est absent ou trop court,
 * on refuse de signer ou de vérifier une session (fail closed).
 * Ce module n'importe rien de Node/Next : il est utilisable dans le proxy (edge).
 */
export const MIN_SESSION_SECRET_LENGTH = 32

export class MissingSessionSecretError extends Error {
  constructor(message?: string) {
    super(
      message ??
        `SESSION_SECRET manquant ou trop court (minimum ${MIN_SESSION_SECRET_LENGTH} caractères). ` +
          'Générez-en un avec `openssl rand -base64 48` et définissez-le dans les variables d\'environnement (Vercel).'
    )
    this.name = 'MissingSessionSecretError'
  }
}

export function getSessionSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.trim().length < MIN_SESSION_SECRET_LENGTH) {
    throw new MissingSessionSecretError()
  }
  return new TextEncoder().encode(secret)
}
