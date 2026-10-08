'use client'

import DocumentList from '@/components/commercial/DocumentList'
import { useSession } from '@/hooks/useSession'

export default function SupplierInvoicesPage() {
  const { tenantId } = useSession()

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