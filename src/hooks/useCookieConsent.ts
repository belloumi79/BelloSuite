'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type CookieConsent,
  type ConsentType,
  DEFAULT_CONSENT,
  saveConsent,
  loadConsent,
  hasConsent,
} from '@/lib/cookies'

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT)
  const [showBanner, setShowBanner] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = loadConsent()
    if (stored) {
      setConsent(stored)
      setShowBanner(false)
    } else {
      setShowBanner(true)
    }
    setIsLoaded(true)
  }, [])

  const acceptAll = useCallback(() => {
    const full: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: 0,
      version: DEFAULT_CONSENT.version,
    }
    saveConsent(full)
    setConsent(full)
    setShowBanner(false)
  }, [])

  const rejectAll = useCallback(() => {
    const minimal: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: 0,
      version: DEFAULT_CONSENT.version,
    }
    saveConsent(minimal)
    setConsent(minimal)
    setShowBanner(false)
  }, [])

  const updateConsent = useCallback((type: ConsentType, value: boolean) => {
    const updated: CookieConsent = {
      ...consent,
      [type]: value,
      // necessary is always true
      necessary: type === 'necessary' ? true : consent.necessary,
    }
    saveConsent(updated)
    setConsent(updated)
  }, [consent])

  const has = useCallback((type: ConsentType) => {
    if (!isLoaded) return type === 'necessary'
    return hasConsent(type)
  }, [isLoaded])

  return {
    consent,
    showBanner,
    isLoaded,
    acceptAll,
    rejectAll,
    updateConsent,
    has,
    setShowBanner,
  }
}
