/**
 * Re-chiffre les identifiants ASP/TTN encore stockés en clair dans ASPConfiguration
 * (apiKey, apiSecret, sftpPassword, webhookSecret) au format "enc:v1:" (AES-256-GCM).
 *
 * NE PAS lancer sans avoir défini ASP_ENCRYPTION_KEY (la même que sur Vercel) et DATABASE_URL.
 * Par défaut : simulation (aucune écriture). Ajouter --apply pour écrire.
 *
 *   npx tsx scripts/reencrypt-asp-config.ts            # simulation
 *   npx tsx scripts/reencrypt-asp-config.ts --apply    # écrit en base
 *
 * Idempotent : les valeurs déjà chiffrées sont ignorées.
 */
import { PrismaClient } from '@prisma/client'
import { ASP_SECRET_FIELDS, encryptSecret, getEncryptionKey, isEncrypted, decryptSecret } from '../src/lib/secret-crypto'

async function main() {
  const apply = process.argv.includes('--apply')
  const key = getEncryptionKey() // échoue tôt si la clé est absente/invalide
  const prisma = new PrismaClient()
  try {
    const rows = await prisma.aSPConfiguration.findMany()
    let toUpdate = 0
    for (const row of rows) {
      const data: Record<string, string> = {}
      for (const f of ASP_SECRET_FIELDS) {
        const v = row[f]
        if (v && !isEncrypted(v)) {
          const enc = encryptSecret(v, key) as string
          if (decryptSecret(enc, key) !== v) throw new Error(`Vérification aller-retour échouée (${row.id}.${f})`)
          data[f] = enc
        }
      }
      const fields = Object.keys(data)
      if (fields.length === 0) continue
      toUpdate++
      console.log(`${apply ? 'MAJ' : '[simulation]'} tenant=${row.tenantId} champs=${fields.join(',')}`)
      if (apply) await prisma.aSPConfiguration.update({ where: { id: row.id }, data })
    }
    console.log(`${rows.length} ligne(s) lue(s), ${toUpdate} à chiffrer${apply ? ' : écrites.' : ' (simulation, relancer avec --apply).'}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
