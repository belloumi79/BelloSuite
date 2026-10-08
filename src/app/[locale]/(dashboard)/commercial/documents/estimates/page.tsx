'use client'

import DocumentList from '@/components/commercial/DocumentList'
import { useSession } from '@/hooks/useSession'

export default function EstimatesPage() {
  const { tenantId } = useSession()

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