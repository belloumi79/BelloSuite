/**
 * Pages internes vers lesquelles la connexion démo peut rediriger (paramètre `next`).
 * Liste blanche stricte, comparaison exacte : aucune URL externe, aucun chemin libre (pas d'open redirect).
 */
export const DEMO_NEXT_PATHS = [
  '/dashboard',
  '/commercial/documents/estimates',
  '/commercial/documents/new',
  '/commercial/treasury',
  '/commercial/payments',
  '/commercial/clients',
  '/stock',
  '/stock/products',
] as const

export const DEFAULT_DEMO_PATH = '/dashboard'

export function safeDemoNext(next: string | null | undefined): string {
  if (!next) return DEFAULT_DEMO_PATH
  return (DEMO_NEXT_PATHS as readonly string[]).includes(next) ? next : DEFAULT_DEMO_PATH
}
