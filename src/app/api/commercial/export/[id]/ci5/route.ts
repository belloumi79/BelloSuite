import { NextResponse } from 'next/server'
import { prisma } from "@/lib/db"

/**
 * GET /api/commercial/export/:id/ci5
 * Génère le formulaire CI5 (Déclaration en Detail dédouanement)
 * pour l'exportation tunisienne.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  try {
    const exp = await prisma.exportInvoice.findUnique({
      where: { id: id },
      include: {
        invoice: { include: { client: true, tenant: true, items: true } },
      },
    })
    if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const ci5 = {
      declarationNumber: `CI5-${exp.invoice.number}`,
      date: new Date().toISOString().split("T")[0],
      exporter: {
        name: exp.invoice.tenant.name,
        address: exp.invoice.tenant.address,
        city: exp.invoice.tenant.city,
        country: "TN",
      },
      client: {
        name: exp.invoice.client.name,
        address: exp.invoice.client.address,
        city: exp.invoice.client.city,
        country: exp.countryDest,
      },
      items: exp.invoice.items.map((item, i) => ({
        lineNumber: i + 1,
        description: item.description,
        hsCode: exp.hsCode || "",
        countryOfOrigin: exp.countryOrigin,
        netWeightKg: exp.netWeightKg || 0,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitValue: Number(item.unitPriceHT),
        totalValue: Number(item.totalHT),
        incoterm: exp.incoterm,
      })),
      totalFOB: Number(exp.invoice.subtotalHT),
      totalInvoice: Number(exp.invoice.totalTTC),
      currency: exp.invoice.currency,
      transportMode: exp.transportMode || "MARITIME",
      customsPort: exp.customsPort || "",
      exportRegime: exp.exportRegime || "Définitif",
    }

    return NextResponse.json(ci5)
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
