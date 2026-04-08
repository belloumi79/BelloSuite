# Module Stock — Documentation

## Overview
Gestion complete des produits, stocks, entrepots, mouvements de stock, inventaires et transferts en temps reel pour les entreprises tunisiennes.

## Models

### Product
| Champ | Type | Description |
|---|---|---|
| id | String | UUID |
| tenantId | String | Multi-tenant |
| code | String | SKU / reference unique |
| barcode | String? | Code barres |
| name | String | Nom du produit |
| description | String? | Description |
| category | String? | Categorie |
| unit | String | Unite (unit, kg, l, m, piece, box) |
| purchasePrice | Decimal | Prix achat HT |
| salePrice | Decimal | Prix vente HT |
| vatRate | Decimal | Taux TVA (0, 7, 13, 19) |
| fodec | Boolean | FODEC applicable |
| minStock | Decimal | Seuil dalerte stock faible |
| currentStock | Decimal | Stock actuel (theorique) |
| images | Json | Tableau dURLs images |
| variants | Json | Tableau de variantes |
| supplierId | String? | Fournisseur associe |
| isActive | Boolean | Produit actif |
| createdAt | DateTime | Date creation |

### StockMovement
| Champ | Type | Description |
|---|---|---|
| id | String | UUID |
| tenantId | String | Multi-tenant |
| productId | String | Produit reference |
| type | Enum | ENTRY, EXIT, ADJUSTMENT, TRANSFER |
| quantity | Decimal | Quantite (positive) |
| unitPrice | Decimal? | Prix unitaire |
| reference | String? | Reference externe |
| notes | String? | Notes |
| warehouseId | String? | Entrepot (optionnel) |

## IRPP — Tunisia Tax Calculation

\`"""src/lib/fiscal.ts""\`
\`"""typescript
export type ResultatImpot = {
  impot: number;
  tauxEffectif: number;
};

export function calculerImpotTunisie(salaireBrutAnnuel: number): ResultatImpot
"""

Barèmes officiels IRPP Tunisia 2024:

| Tranche annuelle (TND) | Taux |
|---|---|
| 0 - 5 000 | 0% |
| 5 001 - 10 000 | 15% |
| 10 001 - 20 000 | 25% |
| 20 001 - 30 000 | 30% |
| 30 001 - 50 000 | 33% |
| 50 001 - 70 000 | 36% |
| > 70 000 | 38% |

Exemple: 30000 TND -> impot 6250 TND, taux effectif 20.83%

## API Endpoints

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/stock/products?tenantId=X | Liste produits (filtres: search, category, isActive, lowStock) |
| POST | /api/stock/products | Creer produit |
| GET | /api/stock/products/[id]?tenantId=X | Detail produit + mouvements |
| PUT | /api/stock/products/[id]?tenantId=X | Modifier produit |
| DELETE | /api/stock/products/[id]?tenantId=X | Supprimer produit |

### Stock Movements
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/stock/movements?tenantId=X&productId=Y&type=Z&limit=N | Historique mouvements |
| POST | /api/stock/movements | Nouveau mouvement (ENTRY/EXIT) |

### Warehouses
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/stock/warehouses?tenantId=X | Liste entrepots |
| POST | /api/stock/warehouses | Creer entrepot |

### Inventory
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/stock/inventory?tenantId=X | Liste inventaires |
| POST | /api/stock/inventory | Creer inventaire |

### Transfers
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/stock/transfers?tenantId=X | Liste transferts |
| POST | /api/stock/transfers | Creer transfert |

## File Structure

```
src/app/(dashboard)/stock/
├── page.tsx                       # Dashboard stock
├── products/
│   ├── page.tsx                   # Liste produits (CRUD)
│   ├── new/page.tsx               # Formulaire creation
│   └── [id]/
│       ├── page.tsx               # Detail produit + mouvements
│       └── edit/page.tsx          # Formulaire edition
├── inventory/page.tsx             # Inventaires physiques
├── transfers/page.tsx             # Transferts entre entrepots
└── availability/[id]/page.tsx     # Stock par entrepot

src/app/api/stock/
├── products/
│   ├── route.ts                   # GET list + POST create
│   └── [id]/route.ts              # GET + PUT + DELETE
├── movements/route.ts             # GET + POST mouvements
├── warehouses/route.ts            # GET + POST entrepots
├── inventory/route.ts             # GET + POST inventaires
└── transfers/route.ts             # GET + POST transferts

src/lib/
└── fiscal.ts                      # calculerImpotTunisie + TVA invoice
```

## Status / Workflow

### Stock Movement
```
ENTRY  -> augmente currentStock
EXIT   -> diminue currentStock
ADJUSTMENT -> augmente ou diminue
TRANSFER   -> utilise entrepots sources CIBLE
```

### Inventory
```
DRAFT -> VALIDATED -> CANCELLED
```

### Transfer
```
DRAFT -> IN_PROGRESS -> TRANSFERRED -> CANCELLED
```

## TODO — Prochaines etapes
- [ ] Alertes stock faible (notifications)
- [ ] Dashboard analytique (valeur stock, rotations)
- [ ] Import/export CSV produits
- [ ] Code-barres / QR scan
- [ ] Impression etiquette produit
- [ ] Integration POS (vente en caisse)
- [ ] Integration e-commerce
- [ ] Export PDF liste produits
