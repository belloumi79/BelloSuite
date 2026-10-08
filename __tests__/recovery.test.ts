import { parseRecoveryParams } from '@/lib/supabase/recovery'

describe('parseRecoveryParams', () => {
  it('flux implicit (fragment)', () => {
    expect(parseRecoveryParams('#access_token=a&refresh_token=r&type=recovery', '')).toEqual({ kind: 'tokens', accessToken: 'a', refreshToken: 'r' })
  })
  it('flux PKCE (?code=)', () => {
    expect(parseRecoveryParams('', '?code=xyz')).toEqual({ kind: 'code', code: 'xyz' })
  })
  it('token_hash', () => {
    expect(parseRecoveryParams('', '?token_hash=th&type=recovery')).toEqual({ kind: 'token_hash', tokenHash: 'th' })
    expect(parseRecoveryParams('', '?token_hash=th&type=signup')).toEqual({ kind: 'none' })
  })
  it('erreur Supabase (lien expiré)', () => {
    expect(parseRecoveryParams('#error=access_denied&error_description=Email+link+is+invalid+or+has+expired', '')).toEqual({ kind: 'error', message: 'Email link is invalid or has expired' })
  })
  it('rien', () => {
    expect(parseRecoveryParams('', '')).toEqual({ kind: 'none' })
  })
})
