import { NextSeo } from 'next-seo'

export default function SEO() {
  return (
    <NextSeo
      title="BelloSuite ERP - Logiciel de Gestion d'Entreprise Tunisien"
      description="BelloSuite est le logiciel de facturation et de gestion commerciale (ERP) modulaire conçu pour les TPE et PME en Tunisie. Solution complète pour gérer stock, facturation, comptabilité."
      canonical="https://bellosuite.vercel.app"
      openGraph={{
        type: 'website',
        locale: 'fr_TN',
        url: 'https://bellosuite.vercel.app',
        siteName: 'BelloSuite ERP',
        title: 'BelloSuite ERP - Gestion d\'Entreprise Tunisienne',
        description: 'ERP modulaire pour PME tunisiennes : stock, facturation, comptabilité, GRH',
        images: [
          {
            url: 'https://bellosuite.vercel.app/og-image.jpg',
            width: 1200,
            height: 630,
            alt: 'BelloSuite ERP',
          },
        ],
      }}
      twitter={{
        handle: '@bellosuite',
        site: '@bellosuite',
        cardType: 'summary_large_image',
      }}
      additionalMetaTags={[
        {
          name: 'keywords',
          content: 'ERP, logiciel gestion, facturation tunisie, stock management, comptabilité PME, logiciel tunisien'
        },
        {
          name: 'author',
          content: 'BelloSuite'
        },
        {
          name: 'robots',
          content: 'index, follow'
        },
        {
          name: 'language',
          content: 'French'
        }
      ]}
    />
  )
}