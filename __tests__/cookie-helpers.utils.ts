// Re-implementations of cookie helpers for unit testing (no browser deps)

export interface CookieConsent {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

const STORAGE_KEY = 'bello_cookie_consent'

export function getCookieConsent(): CookieConsent {
  try {
    const raw = global.localStorage?.getItem(STORAGE_KEY)
    if (!raw) return { necessary: true, analytics: false, marketing: false }
    return JSON.parse(raw) as CookieConsent
  } catch {
    return { necessary: true, analytics: false, marketing: false }
  }
}

export function setCookieConsent(consent: CookieConsent): void {
  global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(consent))
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent().analytics
}

export function hasMarketingConsent(): boolean {
  return getCookieConsent().marketing
}

export function deleteCookieConsent(): void {
  global.localStorage?.removeItem(STORAGE_KEY)
}