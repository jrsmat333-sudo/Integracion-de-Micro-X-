import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import AttractionDetail from './components/AttractionDetail'
import { getCurrentUser, removeToken, getTopAttractions, getAttractions } from './services/api'

// Carousel images
import img1 from './assets/Carrusel/img1.JPG'
import img4 from './assets/Carrusel/img4.jpg'
import img5 from './assets/Carrusel/img5.jpg'
import imagen6 from './assets/Carrusel/imagen6.jpg'
import img7 from './assets/Carrusel/img7.jpg'
import img9 from './assets/Carrusel/img9.jpg'
import carouselLogo from './assets/Carrusel/logo.png'

// Section assets
import imgSeccion3 from './assets/IMGSECCION3.jpeg'
import mapaEc from './assets/mapaec.png'
import neko9 from './assets/neko9.jpg'
import neko6 from './assets/neko6.jpg'

const CAROUSEL_IMAGES = [img1, img4, img5, imagen6, img7, img9]
const CAROUSEL_INTERVAL = 6000

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

// ── Section 1: Hero Carousel ──────────────────────────────────────────────────

function HeroCarousel() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % CAROUSEL_IMAGES.length)
    }, CAROUSEL_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="h-screen w-full relative overflow-hidden">
      {CAROUSEL_IMAGES.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover animate-kenBurns"
          />
        </div>
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/50" />

      {/* Center content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
        <img
          src={carouselLogo}
          alt="Ady Cats"
          className="w-40 sm:w-56 mb-8 drop-shadow-2xl object-contain"
        />
        <h1 className="font-serif text-4xl sm:text-6xl font-light text-white leading-tight mb-4 drop-shadow-lg">
          Descubre el mundo a tu ritmo
        </h1>
        <p className="font-sans text-white/80 text-sm sm:text-base max-w-xl leading-relaxed drop-shadow">
          Experiencias únicas diseñadas para los viajeros que aprecian las cosas simples — Proyecto de Microservicios
        </p>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {CAROUSEL_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-0.5 transition-all duration-500 ${
              i === current ? 'w-8 bg-white' : 'w-2 bg-white/40'
            }`}
            aria-label={`Ir a imagen ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

// ── Section 2: General Info ───────────────────────────────────────────────────

const nekoHoverStyle = `
  .neko9-img {
    transition: transform 0.4s cubic-bezier(.34,1.56,.64,1), box-shadow 0.4s ease, filter 0.4s ease;
    border-radius: 2px;
  }
  .neko9-img:hover {
    transform: scale(1.07) rotate(-2deg);
    box-shadow: 0 24px 60px rgba(0,0,0,0.18);
    filter: brightness(1.06) saturate(1.1);
  }
`

function InfoSection() {
  return (
    <section className="bg-[#faf9f6] py-24 px-6 min-h-[50vh]">
      <style>{nekoHoverStyle}</style>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: image with hover animation */}
        <div className="flex items-center justify-center">
          <img
            src={neko9}
            alt="Discover Ecuador"
            className="neko9-img max-w-xs w-full object-cover shadow-lg"
          />
        </div>

        {/* Right: text */}
        <div>
          <h2 className="font-serif text-4xl sm:text-5xl font-light text-cominca-charcoal mb-10 leading-tight">
            Discover the essence of Ecuador
          </h2>
          <div className="space-y-6 font-sans text-cominca-sand text-base leading-relaxed">
            <p>
              Nestled between the Andes, the Amazon, the Pacific Coast, and the Galápagos Islands,
              Ecuador offers an unforgettable journey filled with culture, history, and breathtaking
              natural beauty.
            </p>
            <p>
              We create authentic experiences that connect travelers with Ecuador&apos;s rich traditions,
              vibrant communities, and extraordinary landscapes, while blending comfort and modern
              hospitality with the country&apos;s timeless charm.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 3: Full-screen Separator Image ────────────────────────────────────

function SeparatorSection() {
  return (
    <section
      className="h-screen w-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${imgSeccion3})` }}
    />
  )
}

// ── Section 4: Map + Text ─────────────────────────────────────────────────────

function MapSection() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left: map image */}
        <div className="flex items-center justify-center">
          <img
            src={mapaEc}
            alt="Mapa de Ecuador"
            className="max-w-sm w-full object-contain"
          />
        </div>

        {/* Right: text */}
        <div>
          <h2 className="font-serif text-7xl sm:text-8xl font-light text-cominca-charcoal mb-6 leading-none">
            Ecuador
          </h2>
          <p className="font-sans text-cominca-charcoal text-base leading-relaxed mb-5">
            A country of breathtaking diversity where the Andes, the Amazon, the Pacific Coast, and
            the Galápagos Islands come together to create unforgettable experiences filled with
            culture, history, and natural beauty.
          </p>
          <p className="font-sans text-cominca-sand text-sm leading-relaxed">
            A land of vibrant traditions, stunning landscapes, and timeless charm where every
            destination tells a unique story.
          </p>
        </div>
      </div>
    </section>
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
    <div>
      {/* New sections */}
      <HeroCarousel />
      <InfoSection />
      <SeparatorSection />
      <MapSection />

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
          <div className="flex items-center gap-4">
            <img
              src={neko6}
              alt=""
              className="w-14 h-14 object-cover rounded-full shadow-md flex-shrink-0 opacity-90"
            />
            <div>
              <p className="label-elegant mb-2">Catálogo</p>
              <h2 className="font-serif text-3xl font-light text-cominca-charcoal">
                Descubre todas las experiencias
              </h2>
            </div>
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
