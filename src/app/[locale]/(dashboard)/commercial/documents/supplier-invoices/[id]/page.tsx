'use client'

import { useParams } from 'next/navigation'
import { PurchaseDocDetail } from '@/components/purchases/PurchasesUI'

export default function PurchaseDocPage() {
  const { id } = useParams<{ id: string }>()
  return <PurchaseDocDetail id={id} />
}
