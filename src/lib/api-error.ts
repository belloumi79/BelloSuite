/** Filtrage des messages d'erreur API avant affichage (testé dans __tests__/api-error.test.ts). */

/** Message d'erreur affichable (métier, 4xx) ou undefined (5xx ou message générique non traduit). */
export function apiErrorMessage(ok: boolean, status: number, data: unknown): string | undefined {
  if (ok || status >= 500) return undefined
  const msg = (data as { error?: unknown } | null)?.error
  if (typeof msg !== 'string' || !msg.trim()) return undefined
  if (/^(internal server error|missing required fields|not found|unauthorized|forbidden)$/i.test(msg.trim())) return undefined
  return msg
}
