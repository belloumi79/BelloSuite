import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">BelloSuite</h1>
        <p className="text-zinc-400 mb-8">ERP Modulaire pour la Tunisie</p>
        <div className="space-x-4">
          <Link href="/login" className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700">
            Connexion
          </Link>
          <Link href="/register" className="px-6 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700">
            Inscription
          </Link>
        </div>
      </div>
    </div>
  )
}
