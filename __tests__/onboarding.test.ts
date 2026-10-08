import { slugifySubdomain, postLoginPath } from '@/lib/onboarding'

describe('slugifySubdomain', () => {
  it('normalise accents, espaces et caractères spéciaux', () => {
    expect(slugifySubdomain('Société Générale & Fils')).toBe('societe-generale-fil')
    expect(slugifySubdomain('  --Abc--  ')).toBe('abc')
  })
  it('ne finit jamais par un tiret après troncature', () => {
    expect(slugifySubdomain('abcdefghijklmnopqrs tuv')).toBe('abcdefghijklmnopqrs')
  })
})

describe('postLoginPath', () => {
  it('SUPER_ADMIN va toujours vers /super-admin, même sans tenant', () => {
    expect(postLoginPath('fr', 'SUPER_ADMIN', null, '/dashboard')).toBe('/fr/super-admin')
    expect(postLoginPath('ar', 'SUPER_ADMIN', 't1')).toBe('/ar/super-admin')
  })
  it('utilisateur sans tenant → onboarding', () => {
    expect(postLoginPath('fr', 'USER', null)).toBe('/fr/onboarding')
  })
  it('utilisateur avec tenant → next sûr ou /dashboard', () => {
    expect(postLoginPath('en', 'ADMIN', 't1', '/stock')).toBe('/en/stock')
    expect(postLoginPath('fr', 'ADMIN', 't1', '//evil.com')).toBe('/fr/dashboard')
    expect(postLoginPath('fr', 'ADMIN', 't1', null)).toBe('/fr/dashboard')
  })
})
