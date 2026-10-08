import '../globals.css'

// Layout racine minimal pour les pages hors [locale] (/, /login, /auth/callback).
// Next 16 exige un layout racine pour chaque page.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
