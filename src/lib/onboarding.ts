/** Normalise un nom d'entreprise en sous-domaine : minuscules, sans accents, [a-z0-9-], 20 caractères max. */
export function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .replace(/-+$/g, '')
}

/** Destination après connexion selon le rôle et le tenant (préfixe de langue inclus). */
export function postLoginPath(locale: string, role: string, tenantId: string | null, next?: string | null): string {
  if (role === 'SUPER_ADMIN') return `/${locale}/super-admin`
  if (!tenantId) return `/${locale}/onboarding`
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
  return `/${locale}${safeNext}`
}
