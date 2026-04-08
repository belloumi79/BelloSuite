'use client'

import { useState, useEffect } from 'react'
import DocumentList from '@/components/commercial/DocumentList'

export default function EstimatesPage() {
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) setTenantId(JSON.parse(s).tenantId)
  }, [])

  if (!tenantId) return <div className="p-8 text-center text-stone-400 font-bold">Chargement...</div>

  return (
    <DocumentList
      tenantId={tenantId}
      type="QUOTE"
      title="Devis"
      documentLabel="Devis"
      accentColor="emerald"
      apiEndpoint="/api/commercial/documents"
      newHref="/commercial/documents/new?type=QUOTE"
    />
  )
}