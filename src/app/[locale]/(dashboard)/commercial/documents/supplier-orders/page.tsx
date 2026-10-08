'use client'

import DocumentList from '@/components/commercial/DocumentList'
import { useSession } from '@/hooks/useSession'

export default function SupplierOrdersPage() {
  const { tenantId } = useSession()

  return (
    <DocumentList
      tenantId={tenantId}
      type="SUPPLIER_ORDER"
      accentColor="amber"
      apiEndpoint="/api/commercial/suppliers/orders"
      newHref="/commercial/documents/new?type=PURCHASE_ORDER"
      showSupplier
    />
  )
}