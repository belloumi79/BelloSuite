'use client'

import DocumentList from '@/components/commercial/DocumentList'
import { useSession } from '@/hooks/useSession'

export default function ClientOrdersPage() {
  const { tenantId } = useSession()

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