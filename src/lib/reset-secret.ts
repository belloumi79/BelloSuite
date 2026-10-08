import { MissingSessionSecretError, MIN_SESSION_SECRET_LENGTH } from './session-secret'

/** Secret HMAC des liens de réinitialisation. Pas de valeur de repli (fail closed). */
export function getResetSecret(): string {
  const secret = process.env.RESET_SECRET || process.env.SESSION_SECRET
  if (!secret || secret.trim().length < MIN_SESSION_SECRET_LENGTH) {
    throw new MissingSessionSecretError(
      'RESET_SECRET (ou SESSION_SECRET) manquant ou trop court : impossible de signer/vérifier un lien de réinitialisation.'
    )
  }
  return secret
}
