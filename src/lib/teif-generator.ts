/**
 * TEIF 1.8.7/2.0 XML Generator for Tunisia (TradeNet / El Fatoora)
 * Compliant with Tunisian e-Invoicing Standard 2026
 */

export interface TEIFData {
  invoiceNumber: string
  type: string
  issueDate: string
  dueDate?: string
  tenant: {
    name: string
    matriculeFiscal: string
    address: string
    city: string
    zipCode: string
    phone?: string
  }
  client: {
    name: string
    matriculeFiscal: string
    address: string
    city: string
    zipCode?: string
  }
  items: any[]
  totals: {
    subtotalHT: number
    totalFodec: number
    totalVAT: number
    timbreFiscal: number
    totalTTC: number
    vatSummary: { [rate: number]: { base: number, amount: number } }
  }
}

function formatDate(isoString: string) {
  // ISO is YYYY-MM-DD. Convert to DDMMYY
  if (!isoString) return ''
  const parts = isoString.split('-')
  if (parts.length === 3) {
    return `${parts[2]}${parts[1]}${parts[0].substring(2)}`
  }
  return isoString
}

export function generateTEIFXml(data: TEIFData): string {
  const { tenant, client, totals, items } = data
  
  const issueDateFormatted = formatDate(data.issueDate)
  const dueDateFormatted = data.dueDate ? formatDate(data.dueDate) : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TEIF version="1.8.7" controlingAgency="TTN">
    <InvoiceHeader>
        <MessageSenderIdentifier>${tenant.matriculeFiscal}</MessageSenderIdentifier>
        <MessageRecieverIdentifier>TTN</MessageRecieverIdentifier>
    </InvoiceHeader>
    <InvoiceBody>
        <Bgm>
            <DocumentIdentifier>${data.invoiceNumber}</DocumentIdentifier>
            <DocumentType>${data.type === 'CREDIT_NOTE' ? 'I-12' : 'I-11'}</DocumentType>
        </Bgm>
        <Dtm>
            <IssueDate>${issueDateFormatted}</IssueDate>
            ${dueDateFormatted ? `<DueDate>${dueDateFormatted}</DueDate>` : ''}
        </Dtm>
        <PartnerSection>
            <Supplier>
                <Nad>
                    <PartyName>${tenant.name}</PartyName>
                    <MatriculeFiscal>${tenant.matriculeFiscal}</MatriculeFiscal>
                    <Address>${tenant.address || ''}</Address>
                    <City>${tenant.city || ''}</City>
                    <ZipCode>${tenant.zipCode || ''}</ZipCode>
                    <CountryCode>TN</CountryCode>
                </Nad>
                <CtaSection>
                    <Phone>${tenant.phone || ''}</Phone>
                </CtaSection>
            </Supplier>
            <Customer>
                <Nad>
                    <PartyName>${client.name}</PartyName>
                    <MatriculeFiscal>${client.matriculeFiscal}</MatriculeFiscal>
                    <Address>${client.address || ''}</Address>
                    <City>${client.city || ''}</City>
                    <ZipCode>${client.zipCode || ''}</ZipCode>
                    <CountryCode>TN</CountryCode>
                </Nad>
            </Customer>
        </PartnerSection>
        <LinSection>
            ${items.map((item, i) => `
            <Lin>
                <ItemIdentifier>${item.productId || `ITEM-${i + 1}`}</ItemIdentifier>
                <LinImd>${item.description}</LinImd>
                <LinQty unitCode="${item.unit || 'EA'}">${item.quantity}</LinQty>
                <UnitPriceHT>${item.unitPriceHT.toFixed(3)}</UnitPriceHT>
                <LinMoa>${(item.quantity * item.unitPriceHT).toFixed(3)}</LinMoa>
                <LinTax>${item.vatRate}</LinTax>
            </Lin>
            `).join('')}
        </LinSection>
        <InvoiceMoa>
            <SubTotalHT>${totals.subtotalHT.toFixed(3)}</SubTotalHT>
            <TotalVAT>${totals.totalVAT.toFixed(3)}</TotalVAT>
            <TotalTTC>${totals.totalTTC.toFixed(3)}</TotalTTC>
            <AmountDescription>Arrêtée la présente facture à la somme de: *** ${(totals.totalTTC).toFixed(3)} TND ***</AmountDescription>
        </InvoiceMoa>
        <InvoiceTax>
            ${Object.entries(totals.vatSummary).map(([rate, sm]: any) => `
            <TaxCategory>
                <TaxRate>${rate}</TaxRate>
                <TaxableAmount>${sm.base.toFixed(3)}</TaxableAmount>
                <TaxAmount>${sm.amount.toFixed(3)}</TaxAmount>
            </TaxCategory>
            `).join('')}
            ${totals.totalFodec > 0 ? `
            <TaxCategory>
                <TaxType>FODEC</TaxType>
                <TaxRate>1</TaxRate>
                <TaxableAmount>${totals.subtotalHT.toFixed(3)}</TaxableAmount>
                <TaxAmount>${totals.totalFodec.toFixed(3)}</TaxAmount>
            </TaxCategory>
            ` : ''}
            <TaxCategory>
                <TaxType>STAMP</TaxType>
                <TaxAmount>${totals.timbreFiscal.toFixed(3)}</TaxAmount>
            </TaxCategory>
        </InvoiceTax>
    </InvoiceBody>
</TEIF>`

  return xml.trim()
}
