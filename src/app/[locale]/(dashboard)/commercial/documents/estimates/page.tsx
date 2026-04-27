'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import DocumentList from '@/components/commercial/DocumentList'

export default function EstimatesPage() {
  const t = useTranslations('Commercial.DocumentList')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    async function checkSession() { try { const res = await fetch('/api/auth/session'); if (res.ok) { const sessionData = await res.json(); setTenantId(sessionData.tenantId || ''); } } catch (err) { console.error('Session check failed:', err); } } checkSession(); /* const s = null
    if (s) setTenantId(JSON.parse(s).tenantId)
  }, [])

  if (!tenantId) return <div className="p-8 text-center text-stone-400 font-bold tracking-tight">{t('loading')}</div>

  return (
    <DocumentList
      tenantId={tenantId}
      type="QUOTE"
      accentColor="emerald"
      apiEndpoint="/api/commercial/documents"
      newHref="/commercial/documents/new?type=QUOTE"
    />
  )
}