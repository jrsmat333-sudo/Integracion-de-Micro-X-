import { useState, useEffect, useCallback } from 'react'
import { getAttractionBySlug, getProductOptionsByAttraction } from '../services/api'

function StarRating({ value }) {
  const rounded = Math.round(value)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= rounded ? 'text-amber-400' : 'text-cominca-border'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-sans text-cominca-sand">
        {value > 0 ? value.toFixed(1) : 'Nuevo'}
      </span>
    </div>
  )
}

function formatDuration(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export default function AttractionDetail({ slug, onClose }) {
  const [detail, setDetail]   = useState(null)
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getAttractionBySlug(slug)
      .then(raw => {
        const d = raw?.data ?? raw
        setDetail(d)
        if (d?.id) {
          return getProductOptionsByAttraction(d.id)
            .then(optRaw => {
              const payload = optRaw?.data ?? optRaw
              setOptions(Array.isArray(payload) ? payload : (payload?.items || []))
            })
            .catch(() => {})
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      {/* Blurred backdrop */}
      <div
        className="fixed inset-0 bg-cominca-charcoal/70 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start justify-center p-4 py-10">
        <div className="relative bg-cominca-cream w-full max-w-4xl shadow-2xl animate-fadeSlideUp overflow-hidden">

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center bg-white/90 hover:bg-white shadow-sm transition-colors border border-cominca-border"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {loading ? (
            <div className="p-20 flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-cominca-forest border-t-transparent rounded-full animate-spin" />
              <p className="text-cominca-sand font-sans text-sm">Cargando atracción…</p>
            </div>
          ) : error ? (
            <div className="p-20 text-center">
              <p className="text-red-500 font-sans text-sm">{error}</p>
              <button onClick={onClose} className="btn-ghost mt-4 text-xs px-4 py-2">Cerrar</button>
            </div>
          ) : detail ? (
            <>
              {/* Hero image */}
              <div className="relative h-72 bg-cominca-light overflow-hidden">
                {detail.imageUrl ? (
                  <img
                    src={detail.imageUrl}
                    alt={detail.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-cominca-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 20l5-10 4 6 3-4 5 8H2z" />
                      <circle cx="17" cy="7" r="2" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-cominca-charcoal/70 via-cominca-charcoal/20 to-transparent" />
                <div className="absolute bottom-5 left-7">
                  <p className="label-elegant text-white/60 mb-1">{detail.locationCountryCode} · {detail.locationName}</p>
                  <h2 className="font-serif text-4xl font-light text-white leading-tight">{detail.name}</h2>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 space-y-7">

                {/* Rating + meta chips */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <StarRating value={detail.ratingAverage ?? 0} />
                  <div className="flex items-center gap-2 flex-wrap">
                    {detail.difficultyLevel && (
                      <span className="px-3 py-1 border border-cominca-border text-xs font-sans tracking-widest uppercase text-cominca-sand">
                        {detail.difficultyLevel}
                      </span>
                    )}
                    {detail.minAge != null && (
                      <span className="px-3 py-1 border border-cominca-border text-xs font-sans text-cominca-sand">
                        {detail.minAge}+ años
                      </span>
                    )}
                    {detail.maxGroupSize != null && (
                      <span className="px-3 py-1 border border-cominca-border text-xs font-sans text-cominca-sand">
                        Grupo máx: {detail.maxGroupSize}
                      </span>
                    )}
                  </div>
                </div>

                {/* Short description */}
                {detail.descriptionShort && (
                  <p className="font-sans text-cominca-charcoal text-base leading-relaxed">
                    {detail.descriptionShort}
                  </p>
                )}

                {/* Full description */}
                {detail.descriptionFull && (
                  <div className="border-t border-cominca-border pt-6">
                    <p className="font-sans text-cominca-sand text-sm leading-relaxed whitespace-pre-line">
                      {detail.descriptionFull}
                    </p>
                  </div>
                )}

                {/* Address / Meeting point */}
                {(detail.address || detail.meetingPoint) && (
                  <div className="border-t border-cominca-border pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {detail.address && (
                      <div>
                        <p className="label-elegant mb-1.5">Dirección</p>
                        <p className="font-sans text-sm text-cominca-charcoal">{detail.address}</p>
                      </div>
                    )}
                    {detail.meetingPoint && (
                      <div>
                        <p className="label-elegant mb-1.5">Punto de encuentro</p>
                        <p className="font-sans text-sm text-cominca-charcoal">{detail.meetingPoint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Modalidades */}
                <div className="border-t border-cominca-border pt-6">
                  <p className="label-elegant mb-4">
                    Modalidades disponibles
                    {options.length > 0 && <span className="ml-2 normal-case">({options.length})</span>}
                  </p>

                  {options.length === 0 ? (
                    <p className="font-sans text-cominca-sand text-sm">No hay modalidades disponibles aún.</p>
                  ) : (
                    <div className="space-y-4">
                      {options.map(opt => (
                        <div key={opt.id} className="card p-5">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <h4 className="font-serif text-lg font-light text-cominca-charcoal">{opt.title}</h4>
                            {opt.isPrivate && (
                              <span className="flex-shrink-0 text-xs font-sans px-2 py-0.5 border border-cominca-border text-cominca-sand">
                                Privado
                              </span>
                            )}
                          </div>

                          {opt.description && (
                            <p className="font-sans text-sm text-cominca-sand leading-relaxed mb-3">{opt.description}</p>
                          )}

                          <div className="flex flex-wrap gap-4 text-xs font-sans text-cominca-sand mb-4">
                            {formatDuration(opt.durationMinutes) && (
                              <span>⏱ {formatDuration(opt.durationMinutes)}</span>
                            )}
                            {opt.durationDescription && <span>{opt.durationDescription}</span>}
                            <span>Mín. {opt.minParticipants} participante{opt.minParticipants !== 1 ? 's' : ''}</span>
                            {opt.cancelPolicyHours > 0 && (
                              <span>Cancelación {opt.cancelPolicyHours}h antes</span>
                            )}
                          </div>

                          {opt.priceTiers?.length > 0 && (
                            <div className="border-t border-cominca-border pt-3 space-y-2">
                              {opt.priceTiers.map(tier => (
                                <div key={tier.id} className="flex items-center justify-between">
                                  <span className="font-sans text-sm text-cominca-charcoal">{tier.categoryName}</span>
                                  <span className="font-sans text-sm font-semibold text-cominca-charcoal">
                                    ${tier.price}{' '}
                                    <span className="font-normal text-xs text-cominca-sand">{tier.currencyCode}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
