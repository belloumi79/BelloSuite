'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import DocumentList from '@/components/commercial/DocumentList'

export default function SupplierInvoicesPage() {
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
      type="SUPPLIER_INVOICE"
      accentColor="amber"
      apiEndpoint="/api/commercial/suppliers/orders"
      newHref="/commercial/documents/new?type=PURCHASE_INVOICE"
      showSupplier
    />
  )
}