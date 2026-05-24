import { useState, useEffect, useCallback } from 'react'
import { getAttractionBySlug, getProductOptionsByAttraction, getDisponibilidad, createBooking } from '../services/api'
import PaymentSimulation from './PaymentSimulation'

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

// ── Booking flow sub-modal ────────────────────────────────────────────────────

function BookingFlow({ detail, options, onClose, onBooked }) {
  const [step, setStep] = useState('slot')        // slot | passengers | billing | confirm
  const [disponibilidad, setDisponibilidad] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  // Auto-select when there's only one option; otherwise require explicit selection
  const [selectedOption, setSelectedOption] = useState(options.length === 1 ? options[0] : null)
  const [passengers, setPassengers] = useState([])
  const [billing, setBilling] = useState({ customerName: '', taxId: '', email: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState(null)

  // Load availability only after an option is chosen, filtered by its productOptionId
  useEffect(() => {
    if (!detail?.id || !selectedOption?.id) {
      setDisponibilidad([])
      return
    }
    setLoadingSlots(true)
    setSelectedDay(null)
    setSelectedSlot(null)
    getDisponibilidad(detail.id, selectedOption.id)
      .then(raw => {
        const d = raw?.data ?? raw
        setDisponibilidad(Array.isArray(d) ? d : [])
      })
      .catch(() => setDisponibilidad([]))
      .finally(() => setLoadingSlots(false))
  }, [detail?.id, selectedOption?.id])

  // Build one passenger entry per priceTier of selected option
  function initPassengers(opt) {
    if (!opt?.priceTiers?.length) return [{ priceTierId: '', label: 'Ticket', price: 0, firstName: '', lastName: '', documentType: 'CI', documentNumber: '' }]
    return opt.priceTiers.map(t => ({
      priceTierId: t.id,
      label: t.categoryName,
      price: t.price,
      currencyCode: t.currencyCode,
      firstName: '', lastName: '', documentType: 'CI', documentNumber: '',
    }))
  }

  function handleSelectOption(opt) {
    setSelectedOption(opt)
    setPassengers(initPassengers(opt))
  }

  function handleSelectSlot(day, slot) {
    setSelectedDay(day)
    setSelectedSlot(slot)
    if (!passengers.length && selectedOption) setPassengers(initPassengers(selectedOption))
  }

  function updatePassenger(idx, field, value) {
    setPassengers(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }

  const total = passengers.reduce((s, p) => s + (Number(p.price) || 0), 0)

  async function handleSubmit() {
    setBookingError(null)
    setSubmitting(true)
    try {
      const body = {
        slotId:          selectedSlot.slotId,
        attractionId:    detail.id,
        productOptionId: selectedOption?.id ?? '',
        contactName:     billing.customerName || passengers[0]?.firstName || 'Invitado',
        contactEmail:    billing.email,
        tickets: passengers.map(p => ({
          priceTierId:    p.priceTierId || undefined,
          firstName:      p.firstName,
          lastName:       p.lastName,
          documentType:   p.documentType,
          documentNumber: p.documentNumber,
        })),
        billing: {
          customerName: billing.customerName,
          taxId:        billing.taxId,
          email:        billing.email,
          address:      billing.address,
        },
      }
      const raw = await createBooking(body)
      const d   = raw?.data ?? raw
      onBooked({
        bookingId:     d?.bookingId,
        pnrCode:       d?.pnrCode,
        totalAmount:   d?.totalAmount ?? total,
        currency:      d?.currency ?? 'USD',
        attractionName: detail.name,
        activityDate:  d?.activityDate,
      })
    } catch (err) {
      setBookingError(err.message || 'Error al crear la reserva')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[210] overflow-y-auto flex items-start justify-center p-4 py-10">
      <div className="fixed inset-0 bg-cominca-charcoal/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-cominca-cream w-full max-w-2xl shadow-2xl animate-fadeSlideUp overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-cominca-border">
          <div>
            <p className="label-elegant mb-0.5">Reservar experiencia</p>
            <h3 className="font-serif text-xl font-light text-cominca-charcoal">{detail.name}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-cominca-border hover:bg-cominca-light transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-cominca-border">
          {[['slot','1. Fecha y hora'],['passengers','2. Pasajeros'],['billing','3. Facturación']].map(([s, label]) => (
            <div key={s} className={`flex-1 py-3 text-center text-xs font-sans tracking-wide transition-colors
              ${step === s ? 'border-b-2 border-cominca-charcoal text-cominca-charcoal font-medium' : 'text-cominca-sand'}`}>
              {label}
            </div>
          ))}
        </div>

        <div className="p-7">

          {/* ── STEP 1: Slot selection ── */}
          {step === 'slot' && (
            <div className="space-y-5">
              {options.length > 0 && (
                <div>
                  <p className="label-elegant mb-3">Modalidad</p>
                  <div className="space-y-2">
                    {options.map(opt => (
                      <label key={opt.id} className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors
                        ${selectedOption?.id === opt.id ? 'border-cominca-charcoal bg-cominca-light' : 'border-cominca-border hover:bg-cominca-light/50'}`}>
                        <input type="radio" name="option" checked={selectedOption?.id === opt.id} onChange={() => handleSelectOption(opt)} className="accent-cominca-forest" />
                        <div className="flex-1">
                          <p className="font-sans text-sm font-medium text-cominca-charcoal">{opt.title}</p>
                          {opt.priceTiers?.[0] && (
                            <p className="text-xs text-cominca-sand">Desde ${opt.priceTiers[0].price} {opt.priceTiers[0].currencyCode}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="label-elegant mb-3">Disponibilidad</p>
                {!selectedOption ? (
                  <p className="font-sans text-cominca-sand text-sm py-6 text-center bg-cominca-light border border-cominca-border">
                    Selecciona una modalidad para ver la disponibilidad.
                  </p>
                ) : loadingSlots ? (
                  <div className="h-32 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-cominca-forest border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : disponibilidad.length === 0 ? (
                  <p className="font-sans text-cominca-sand text-sm py-6 text-center">No hay cupos disponibles en los próximos 30 días.</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {disponibilidad.map(day => (
                      <div key={day.fecha} className="border border-cominca-border">
                        <div className="px-4 py-2 bg-cominca-light flex items-center justify-between">
                          <span className="font-sans text-sm font-medium text-cominca-charcoal">{day.fecha}</span>
                          <span className="text-xs text-cominca-sand">{day.cuposDisponibles} cupos</span>
                        </div>
                        <div className="p-3 space-y-2">
                          {day.horarios?.map(h => (
                            <label key={h.slotId} className={`flex items-center gap-3 px-3 py-2 cursor-pointer border transition-colors
                              ${selectedSlot?.slotId === h.slotId ? 'border-cominca-charcoal bg-cominca-light' : 'border-cominca-border hover:bg-cominca-light/30'}`}>
                              <input type="radio" name="slot" checked={selectedSlot?.slotId === h.slotId}
                                onChange={() => handleSelectSlot(day.fecha, h)} className="accent-cominca-forest" />
                              <span className="font-sans text-sm text-cominca-charcoal">{h.horaInicio}{h.horaFin ? ` – ${h.horaFin}` : ''}</span>
                              <span className="ml-auto text-xs text-cominca-sand">{h.cuposDisponibles}/{h.cuposTotales} disp.</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => { if (!passengers.length && selectedOption) setPassengers(initPassengers(selectedOption)); setStep('passengers') }}
                  disabled={!selectedSlot}
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Passengers ── */}
          {step === 'passengers' && (
            <div className="space-y-5">
              <div className="text-xs font-sans text-cominca-sand bg-cominca-light px-4 py-2 border border-cominca-border">
                Slot seleccionado: <strong>{selectedDay}</strong> · {selectedSlot?.horaInicio}{selectedSlot?.horaFin ? ` – ${selectedSlot.horaFin}` : ''}
              </div>

              {passengers.map((p, i) => (
                <div key={i} className="border border-cominca-border p-4 space-y-4">
                  <p className="label-elegant">{p.label} {passengers.length > 1 ? `#${i+1}` : ''} — ${p.price} {p.currencyCode}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-elegant block mb-1">Nombre</label>
                      <input className="input-elegant w-full" value={p.firstName} onChange={e => updatePassenger(i, 'firstName', e.target.value)} placeholder="María" required />
                    </div>
                    <div>
                      <label className="label-elegant block mb-1">Apellido</label>
                      <input className="input-elegant w-full" value={p.lastName} onChange={e => updatePassenger(i, 'lastName', e.target.value)} placeholder="García" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label-elegant block mb-1">Tipo doc.</label>
                      <select className="input-elegant w-full" value={p.documentType} onChange={e => updatePassenger(i, 'documentType', e.target.value)}>
                        <option value="CI">Cédula</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-elegant block mb-1">Nº Documento</label>
                      <input className="input-elegant w-full" value={p.documentNumber} onChange={e => updatePassenger(i, 'documentNumber', e.target.value)} placeholder="0000000000" required />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep('slot')} className="btn-ghost text-xs px-4 py-2">← Atrás</button>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-sans text-cominca-charcoal font-medium">Total: ${total.toFixed(2)}</span>
                  <button
                    onClick={() => setStep('billing')}
                    disabled={passengers.some(p => !p.firstName || !p.lastName || !p.documentNumber)}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continuar →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Billing + confirm ── */}
          {step === 'billing' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label-elegant block mb-1">Nombre / Razón Social</label>
                  <input className="input-elegant w-full" value={billing.customerName} onChange={e => setBilling(b => ({ ...b, customerName: e.target.value }))} placeholder="María García" />
                </div>
                <div>
                  <label className="label-elegant block mb-1">RUC / Cédula</label>
                  <input className="input-elegant w-full" value={billing.taxId} onChange={e => setBilling(b => ({ ...b, taxId: e.target.value }))} placeholder="0912345678" />
                </div>
                <div>
                  <label className="label-elegant block mb-1">Correo electrónico</label>
                  <input type="email" className="input-elegant w-full" value={billing.email} onChange={e => setBilling(b => ({ ...b, email: e.target.value }))} placeholder="maria@email.com" />
                </div>
                <div className="col-span-2">
                  <label className="label-elegant block mb-1">Dirección</label>
                  <input className="input-elegant w-full" value={billing.address} onChange={e => setBilling(b => ({ ...b, address: e.target.value }))} placeholder="Av. Principal 123, Guayaquil" />
                </div>
              </div>

              {/* Summary */}
              <div className="border border-cominca-border p-4 bg-cominca-light space-y-1.5">
                <p className="label-elegant mb-2">Resumen</p>
                {passengers.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm font-sans">
                    <span className="text-cominca-sand">{p.label} {passengers.length > 1 ? `#${i+1}` : ''} ({p.firstName})</span>
                    <span className="text-cominca-charcoal">${Number(p.price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-sans font-semibold border-t border-cominca-border pt-1.5 mt-1">
                  <span className="text-cominca-charcoal">Total</span>
                  <span className="text-cominca-charcoal">${total.toFixed(2)}</span>
                </div>
              </div>

              {bookingError && (
                <p className="text-red-600 text-sm font-sans bg-red-50 border border-red-200 px-4 py-2">{bookingError}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep('passengers')} className="btn-ghost text-xs px-4 py-2">← Atrás</button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-40">
                  {submitting ? 'Procesando…' : 'Confirmar y pagar →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AttractionDetail({ slug, onClose }) {
  const [detail, setDetail]   = useState(null)
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showBooking, setShowBooking] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)

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

                {/* Rating + meta chips + CTA */}
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
                    <button
                      onClick={() => setShowBooking(true)}
                      className="btn-primary text-sm px-5 py-2"
                    >
                      Reservar ahora
                    </button>
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

      {/* Booking sub-modal */}
      {showBooking && detail && (
        <BookingFlow
          detail={detail}
          options={options}
          onClose={() => setShowBooking(false)}
          onBooked={(bookingData) => {
            setShowBooking(false)
            setPendingPayment(bookingData)
          }}
        />
      )}

      {/* Payment simulation */}
      {pendingPayment && (
        <PaymentSimulation
          booking={pendingPayment}
          onClose={() => { setPendingPayment(null); onClose() }}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}
