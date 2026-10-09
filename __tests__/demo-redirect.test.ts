import { DEFAULT_DEMO_PATH, DEMO_NEXT_PATHS, safeDemoNext } from '@/lib/demo-redirect'

describe('safeDemoNext (liste blanche de la redirection démo)', () => {
  it('accepte les pages internes de la liste', () => {
    for (const p of DEMO_NEXT_PATHS) expect(safeDemoNext(p)).toBe(p)
  })
  it('par défaut : tableau de bord', () => {
    expect(safeDemoNext(null)).toBe(DEFAULT_DEMO_PATH)
    expect(safeDemoNext('')).toBe(DEFAULT_DEMO_PATH)
  })
  it('refuse tout le reste (pas d’open redirect)', () => {
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/dashboard/../../x',
      '/dashboard?x=1',
      '/stock/products#a',
      'dashboard',
      '/super-admin',
      '/api/auth/demo',
      ' /dashboard',
    ]) {
      expect(safeDemoNext(bad)).toBe(DEFAULT_DEMO_PATH)
    }
  })
})
