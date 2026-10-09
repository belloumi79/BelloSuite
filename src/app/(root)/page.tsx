import { redirect } from 'next/navigation'

// La racine affiche la page d'accueil publique en français.
export default function RootPage() {
  redirect('/fr')
}
