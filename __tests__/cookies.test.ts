/**
 * cookies.test.ts — Unit tests for cookie utilities
 * Tests the pure logic without browser dependencies
 */

import { getCookieConsent, setCookieConsent, hasAnalyticsConsent, hasMarketingConsent } from './cookie-helpers.utils'

// Mock localStorage for node environment
const storage: Record<string, string> = {}
global.localStorage = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => { storage[key] = value },
  removeItem: (key: string) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
  get length() { return Object.keys(storage).length },
  key: (i: number) => Object.keys(storage)[i] ?? null,
} as Storage

beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k])
})

describe('getCookieConsent', () => {
  it('returns default consent when no cookie set', () => {
    expect(getCookieConsent()).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    })
  })

  it('returns stored consent from localStorage', () => {
    setCookieConsent({ necessary: true, analytics: true, marketing: false })
    const consent = getCookieConsent()
    expect(consent.analytics).toBe(true)
  })
})

describe('hasAnalyticsConsent', () => {
  it('returns false when not consented', () => {
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('returns true when analytics consented', () => {
    setCookieConsent({ necessary: true, analytics: true, marketing: false })
    expect(hasAnalyticsConsent()).toBe(true)
  })
})

describe('hasMarketingConsent', () => {
  it('returns false when not consented', () => {
    expect(hasMarketingConsent()).toBe(false)
  })

  it('returns true when marketing consented', () => {
    setCookieConsent({ necessary: true, analytics: true, marketing: true })
    expect(hasMarketingConsent()).toBe(true)
  })
})

describe('setCookieConsent', () => {
  it('stores consent in localStorage', () => {
    setCookieConsent({ necessary: true, analytics: true, marketing: true })
    expect(localStorage.getItem('bello_cookie_consent')).toBeTruthy()
  })
})