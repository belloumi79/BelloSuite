/**
 * En-têtes d'identité internes. Ils ne doivent JAMAIS venir du client :
 * le proxy les supprime systématiquement puis les ré-injecte à partir du JWT vérifié.
 */
export const IDENTITY_HEADERS = [
  'x-user-id',
  'x-user-email',
  'x-user-role',
  'x-tenant-id',
  'x-user-firstname',
] as const

export function stripIdentityHeaders(source: Headers): Headers {
  const headers = new Headers(source)
  for (const h of IDENTITY_HEADERS) headers.delete(h)
  return headers
}
