import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import AttractionDetail from './components/AttractionDetail'
import { getCurrentUser, removeToken, getTopAttractions, getAttractions } from './services/api'
import logo from './assets/keo-arc.jpg'

// ── Attraction Card ───────────────────────────────────────────────────────────

function AttractionCard({ attraction, onSelect }) {
  return (
    <div
      onClick={() => onSelect(attraction.slug)}
      className="group cursor-pointer card overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
    >
      <div className="h-44 bg-cominca-light overflow-hidden flex-shrink-0 relative">
        {attraction.imageUrl ? (
          <img
            src={attraction.imageUrl}
            alt={attraction.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-cominca-light">
            <svg className="w-10 h-10 text-cominca-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 20l5-10 4 6 3-4 5 8H2z" />
              <circle cx="17" cy="7" r="2" />
            </svg>
          </div>
        )}
        {attraction.difficultyLevel && (
          <span className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 text-cominca-charcoal text-xs font-sans tracking-wide">
            {attraction.difficultyLevel}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <p className="label-elegant mb-1">{attraction.locationName}</p>
        <h3 className="font-serif text-lg font-light text-cominca-charcoal leading-snug mb-2 flex-1">
          {attraction.name}
        </h3>
        {attraction.descriptionShort && (
          <p className="font-sans text-cominca-sand text-xs leading-relaxed mb-3 line-clamp-2">
            {attraction.descriptionShort}
          </p>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-cominca-border">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-xs font-sans text-cominca-sand">
              {attraction.ratingAverage > 0 ? attraction.ratingAverage.toFixed(1) : 'Nuevo'}
            </span>
            {attraction.ratingCount > 0 && (
              <span className="text-xs font-sans text-cominca-border ml-0.5">({attraction.ratingCount})</span>
            )}
          </div>
          {attraction.startingPrice > 0 && (
            <span className="font-sans text-cominca-charcoal font-medium text-xs">
              Desde ${attraction.startingPrice}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function AttractionGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-72 bg-cominca-light animate-pulse" />
      ))}
    </div>
  )
}

// ── Landing Page ──────────────────────────────────────────────────────────────

function LandingPage({ onOpenAuth, onAttractionSelect }) {
  const [topAttractions, setTopAttractions] = useState([])
  const [allAttractions, setAllAttractions] = useState([])
  const [loadingTop, setLoadingTop]         = useState(true)
  const [loadingAll, setLoadingAll]         = useState(true)
  const [search, setSearch]                 = useState('')

  useEffect(() => {
    getTopAttractions(5)
      .then(raw => {
        const d = raw?.data ?? raw
        setTopAttractions(Array.isArray(d) ? d : (d?.items || []))
      })
      .catch(() => {})
      .finally(() => setLoadingTop(false))
  }, [])

  useEffect(() => {
    getAttractions({ pageSize: 12 })
      .then(raw => {
        const d = raw?.data ?? raw
        setAllAttractions(Array.isArray(d) ? d : (d?.items || []))
      })
      .catch(() => {})
      .finally(() => setLoadingAll(false))
  }, [])

  const filtered = search.trim()
    ? allAttractions.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.locationName?.toLowerCase().includes(search.toLowerCase())
      )
    : allAttractions

  return (
    <div className="min-h-screen flex flex-col">

      {/* Hero */}
      <section className="flex-shrink-0 flex flex-col items-center justify-center px-6 text-center pt-24 pb-16 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #1F1E1C 0, #1F1E1C 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative mb-8">
          <div className="w-20 h-20 border border-cominca-border rounded-sm mx-auto flex items-center justify-center bg-white shadow-sm">
            <img src={logo} alt="Keo Arc" className="w-14 h-14 object-contain" />
          </div>
          <div className="absolute -inset-3 border border-cominca-border/30 rounded-sm pointer-events-none" />
        </div>

        <p className="label-elegant mb-4 text-cominca-sand">Atracciones · Experiencias · Destinos</p>

        <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-light text-cominca-charcoal leading-tight mb-6 max-w-3xl">
          Descubre el mundo
          <br />
          <em className="text-cominca-forest not-italic">a tu ritmo</em>
        </h1>

        <p className="font-sans text-cominca-sand text-base sm:text-lg font-light max-w-xl leading-relaxed mb-10">
          Experiencias únicas diseñadas para los viajeros que aprecian las cosas bien hechas.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button
            onClick={() => onOpenAuth('register')}
            className="btn-primary px-8 py-3 text-sm tracking-widest"
          >
            Registrarse
          </button>
          <button
            onClick={() => onOpenAuth('login')}
            className="btn-ghost px-8 py-3 text-sm tracking-widest"
          >
            Iniciar sesión
          </button>
        </div>
      </section>

      {/* Top Atracciones */}
      {(loadingTop || topAttractions.length > 0) && (
        <section className="px-6 py-14 max-w-7xl mx-auto w-full">
          <div className="mb-7">
            <p className="label-elegant mb-2">Lo mejor</p>
            <h2 className="font-serif text-3xl font-light text-cominca-charcoal">Atracciones destacadas</h2>
          </div>

          {loadingTop ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-72 bg-cominca-light animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
              {topAttractions.map(a => (
                <AttractionCard key={a.id} attraction={a} onSelect={onAttractionSelect} />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="border-t border-cominca-border mx-6" />

      {/* Catálogo completo */}
      <section className="px-6 py-14 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <p className="label-elegant mb-2">Catálogo</p>
            <h2 className="font-serif text-3xl font-light text-cominca-charcoal">
              Descubre todas las experiencias
            </h2>
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre o destino…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-elegant max-w-xs"
          />
        </div>

        {loadingAll ? (
          <AttractionGridSkeleton count={8} />
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-sans text-cominca-sand text-sm">
              {search ? `Sin resultados para "${search}"` : 'No hay experiencias disponibles aún.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(a => (
              <AttractionCard key={a.id} attraction={a} onSelect={onAttractionSelect} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-cominca-border px-8 py-5 flex items-center justify-between mt-auto">
        <p className="font-serif text-cominca-sand text-sm">Keo Arc</p>
        <p className="text-xs font-sans text-cominca-border">
          © 2026 · Todos los derechos reservados
        </p>
      </footer>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser]               = useState(null)
  const [authModal, setAuthModal]     = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState(null)

  useEffect(() => {
    const saved = getCurrentUser()
    if (saved) setUser(saved)
  }, [])

  function handleAuth(loggedUser) {
    setUser(loggedUser)
    setAuthModal(null)
  }

  function handleLogout() {
    removeToken()
    setUser(null)
    setShowProfile(false)
  }

  const isAdmin = user?.role === 'Admin' || user?.role === 'Partner'

  if (isAdmin) {
    return <AdminPanel user={user} onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen bg-cominca-cream">
      <Navbar
        user={user}
        onOpenAuth={(tab) => setAuthModal(tab)}
        onLogout={handleLogout}
        onOpenProfile={() => setShowProfile(true)}
      />

      <LandingPage
        onOpenAuth={(tab) => setAuthModal(tab)}
        onAttractionSelect={setSelectedSlug}
      />

      {showProfile && user && (
        <UserProfile user={user} onClose={() => setShowProfile(false)} />
      )}

      {authModal && (
        <AuthModal
          initialTab={authModal}
          onClose={() => setAuthModal(null)}
          onAuth={handleAuth}
        />
      )}

      {selectedSlug && (
        <AttractionDetail slug={selectedSlug} onClose={() => setSelectedSlug(null)} />
      )}
    </div>
  )
}
