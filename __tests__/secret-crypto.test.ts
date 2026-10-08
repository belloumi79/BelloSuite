import { randomBytes } from 'crypto'
import { encryptSecret, decryptSecret, isEncrypted, getEncryptionKey, EncryptionKeyError, encryptAspSecrets, decryptAspConfig, ENC_PREFIX } from '@/lib/secret-crypto'

const KEY_B64 = randomBytes(32).toString('base64')

describe('secret-crypto (AES-256-GCM)', () => {
  const OLD = process.env.ASP_ENCRYPTION_KEY
  beforeEach(() => { process.env.ASP_ENCRYPTION_KEY = KEY_B64 })
  afterAll(() => { process.env.ASP_ENCRYPTION_KEY = OLD })

  it('aller-retour + préfixe enc:v1: + IV aléatoire', () => {
    const a = encryptSecret('s3cr3t') as string
    const b = encryptSecret('s3cr3t') as string
    expect(a.startsWith(ENC_PREFIX)).toBe(true)
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe('s3cr3t')
  })
  it('rétro-compatible : le texte clair historique est renvoyé tel quel', () => {
    expect(decryptSecret('plaintext-legacy')).toBe('plaintext-legacy')
    expect(isEncrypted('plaintext-legacy')).toBe(false)
  })
  it('vides et déjà chiffrés inchangés', () => {
    expect(encryptSecret('')).toBe('')
    expect(encryptSecret(null)).toBeNull()
    const once = encryptSecret('x') as string
    expect(encryptSecret(once)).toBe(once)
  })
  it('détecte une altération (tag GCM)', () => {
    const enc = encryptSecret('abc') as string
    const parts = enc.split(':')
    parts[4] = Buffer.from('zzz').toString('base64')
    expect(() => decryptSecret(parts.join(':'))).toThrow()
  })
  it('fail closed sans clé ou clé de mauvaise taille', () => {
    delete process.env.ASP_ENCRYPTION_KEY
    expect(() => encryptSecret('x')).toThrow(EncryptionKeyError)
    expect(() => getEncryptionKey(Buffer.alloc(16).toString('base64'))).toThrow(EncryptionKeyError)
    // le clair historique reste lisible même sans clé
    expect(decryptSecret('legacy')).toBe('legacy')
  })
  it('ASPConfiguration : seuls les champs secrets sont chiffrés', () => {
    const enc = encryptAspSecrets({ apiKey: 'k', apiSecret: 's', sftpPassword: '', webhookSecret: 'w' })
    expect(isEncrypted(enc.apiKey)).toBe(true)
    expect(enc.sftpPassword).toBe('')
    const row = { provider: 'ttnhub', sftpUsername: 'u', ...enc }
    expect(decryptAspConfig(row)).toEqual({ provider: 'ttnhub', sftpUsername: 'u', apiKey: 'k', apiSecret: 's', sftpPassword: '', webhookSecret: 'w' })
  })
})
