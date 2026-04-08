'use client'

import { useState, useEffect } from 'react'
import DocumentList from '@/components/commercial/DocumentList'

export default function DeliveryNotesPage() {
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) setTenantId(JSON.parse(s).tenantId)
  }, [])

  if (!tenantId) return <div className="p-8 text-center text-stone-400 font-bold">Chargement...</div>

  return (
    <DocumentList
      tenantId={tenantId}
      type="DELIVERY_NOTE"
      title="Bons de Livraison"
      documentLabel="Livraison"
      accentColor="purple"
      apiEndpoint="/api/commercial/documents"
      newHref="/commercial/documents/new?type=DELIVERY_NOTE"
    />
  )
}