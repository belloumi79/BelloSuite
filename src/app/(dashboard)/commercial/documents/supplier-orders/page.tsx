'use client'

import { useState, useEffect } from 'react'
import DocumentList from '@/components/commercial/DocumentList'

export default function SupplierOrdersPage() {
  const [tenantId, setTenantId] = useState('')

  useEffect(() => {
    const s = localStorage.getItem('bello_session')
    if (s) setTenantId(JSON.parse(s).tenantId)
  }, [])

  if (!tenantId) return <div className="p-8 text-center text-stone-400 font-bold">Chargement...</div>

  return (
    <DocumentList
      tenantId={tenantId}
      type="ORDER"
      title="Commandes Fournisseurs"
      documentLabel="Commande"
      accentColor="amber"
      apiEndpoint="/api/commercial/suppliers/orders"
      newHref="/commercial/documents/new?type=PURCHASE_ORDER"
      showSupplier
    />
  )
}