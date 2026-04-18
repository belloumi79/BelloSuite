'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import DocumentList from '@/components/commercial/DocumentList'

export default function ClientOrdersPage() {
  const t = useTranslations('Commercial.DocumentList')
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) setTenantId(JSON.parse(s).tenantId)
  }, [])

  if (!tenantId) return <div className="p-8 text-center text-stone-400 font-bold tracking-tight">{t('loading')}</div>

  return (
    <DocumentList
      tenantId={tenantId}
      type="ORDER"
      accentColor="blue"
      apiEndpoint="/api/commercial/documents"
      newHref="/commercial/documents/new?type=ORDER"
    />
  )
}