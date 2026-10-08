'use client'

import DocumentList from '@/components/commercial/DocumentList'
import { useSession } from '@/hooks/useSession'

export default function DeliveryNotesPage() {
  const { tenantId } = useSession()

  return (
    <DocumentList
      tenantId={tenantId}
      type="DELIVERY_NOTE"
      accentColor="purple"
      apiEndpoint="/api/commercial/documents"
      newHref="/commercial/documents/new?type=DELIVERY_NOTE"
    />
  )
}