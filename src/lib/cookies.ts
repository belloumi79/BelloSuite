// Cookie utility helpers for BelloSuite
// Uses localStorage as primary, with optional cookie fallback

export type ConsentType = 'analytics' | 'marketing' | 'functional' | 'necessary'

export interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  functional: boolean
  timestamp: number
  version: string
}

const CONSENT_VERSION = '1.0'
const STORAGE_KEY = 'bellosuite_cookie_consent'

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  functional: false,
  timestamp: 0,
  version: CONSENT_VERSION,
}

export function saveConsent(consent: CookieConsent): void {
  if (typeof window === 'undefined') return
  consent.timestamp = Date.now()
  consent.version = CONSENT_VERSION
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  // Also set a cookie for server-side access (7 days)
  document.cookie = `bellosuite_consent=${encodeURIComponent(JSON.stringify(consent))}; max-age=${7 * 24 * 60 * 60}; path=/; SameSite=Lax`
}

export function loadConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    const consent = JSON.parse(stored) as CookieConsent
    if (consent.version !== CONSENT_VERSION) return null
    return consent
  } catch {
    return null
  }
}

export function hasConsent(type: ConsentType): boolean {
  const consent = loadConsent()
  if (!consent) return type === 'necessary' // Only necessary is default-allowed
  return consent[type]
}

export function clearConsent(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  document.cookie = 'bellosuite_consent=; max-age=0; path=/'
}
