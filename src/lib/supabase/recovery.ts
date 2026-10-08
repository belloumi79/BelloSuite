/**
 * Lecture des paramètres d'un lien de réinitialisation Supabase arrivant sur /{locale}/reset-password.
 * Trois formats possibles selon la configuration Supabase :
 *  - flux implicit (défaut quand la demande part du serveur) : #access_token=…&refresh_token=…&type=recovery
 *  - flux PKCE : ?code=…
 *  - modèle d'email personnalisé : ?token_hash=…&type=recovery
 * Une erreur Supabase arrive en #error=…&error_description=… (ou en query).
 */
export type RecoveryParams =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string }
  | { kind: 'error'; message: string }
  | { kind: 'none' }

export function parseRecoveryParams(hash: string, search: string): RecoveryParams {
  const h = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  const err = h.get('error_description') || h.get('error') || q.get('error_description') || q.get('error')
  if (err) return { kind: 'error', message: err.replace(/\+/g, ' ') }

  const accessToken = h.get('access_token')
  const refreshToken = h.get('refresh_token')
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken }

  const code = q.get('code')
  if (code) return { kind: 'code', code }

  const tokenHash = q.get('token_hash')
  if (tokenHash && (q.get('type') ?? 'recovery') === 'recovery') return { kind: 'token_hash', tokenHash }

  return { kind: 'none' }
}
