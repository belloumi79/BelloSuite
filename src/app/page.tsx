export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-white mb-4">
          BelloSuite
        </h1>
        <p className="text-xl text-zinc-400 mb-8">
          ERP Modulaire Tunisien
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-4 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Connexion
          </a>
        </div>
      </div>
    </main>
  )
}
