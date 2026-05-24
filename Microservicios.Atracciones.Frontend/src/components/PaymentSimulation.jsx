import { useState } from 'react'
import { createPayment, updatePaymentStatus } from '../services/api'
import nekoGif from '../assets/gif-nekoarc.gif'

// ── Card input formatters ─────────────────────────────────────────────────────

function fmtCard(v)   { return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim() }
function fmtExpiry(v) { return v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2') }
function fmtCvc(v)    { return v.replace(/\D/g, '').slice(0, 4) }

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDot({ n, active, done }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-sans font-medium transition-all duration-300
      ${done  ? 'bg-cominca-forest text-white'
              : active ? 'bg-white text-cominca-charcoal ring-2 ring-cominca-forest'
              : 'bg-white/20 text-white/40'}`}
    >
      {done ? '✓' : n}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PaymentSimulation({ booking, onSuccess, onClose }) {
  // booking = { bookingId, pnrCode, totalAmount, currency, attractionName, activityDate }
  const [step, setStep] = useState('form')  // 'form' | 'processing' | 'success' | 'error'
  const [method, setMethod] = useState(1)    // 1=Credit, 2=Debit, 3=Transfer
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' })
  const [error, setError] = useState(null)

  const total     = Number(booking?.totalAmount ?? 0).toFixed(2)
  const currency  = booking?.currency ?? 'USD'
  const pnr       = booking?.pnrCode ?? ''
  const attraction = booking?.attractionName ?? ''

  async function handlePay(e) {
    e.preventDefault()
    setError(null)
    setStep('processing')

    try {
      // Step 2: POST /api/v1/payment (status Pending)
      const raw = await createPayment({
        bookingId:             booking.bookingId,
        paymentMethodId:       method,
        amount:                Number(booking.totalAmount),
        currencyCode:          currency,
        transactionExternalId: `sim_${Date.now()}`,
        statusId:              1,
      })
      const paymentData = raw?.data ?? raw
      const paymentId = paymentData?.id ?? paymentData?.Id

      // Step 3: Wait 7 seconds ("bank verification")
      await new Promise(r => setTimeout(r, 7000))

      // Step 4: PUT /api/v1/payment/{id}/status → Approved (statusId 2)
      await updatePaymentStatus(paymentId, {
        statusId:              2,
        transactionExternalId: `sim_approved_${Date.now()}`,
        gatewayResponse:       'approved',
      })

      setStep('success')
    } catch (err) {
      setError(err.message || 'Error al procesar el pago')
      setStep('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-cominca-charcoal/80 backdrop-blur-md" />

      {/* Card */}
      <div className="relative w-full max-w-md">

        {/* Glassmorphism container */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cominca-forest via-emerald-400 to-cominca-forest" />

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-3 pt-7 pb-4 px-8">
            {['form','processing','success'].map((s, i) => (
              <>
                <StepDot
                  key={s}
                  n={i + 1}
                  active={step === s}
                  done={['processing','success'].indexOf(step) > ['processing','success'].indexOf(s) || (step === 'success' && i <= 2)}
                />
                {i < 2 && (
                  <div key={`line-${i}`} className="flex-1 h-px bg-white/20" />
                )}
              </>
            ))}
          </div>

          {/* Booking summary */}
          <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-white/8 border border-white/12">
            <p className="text-white/50 text-xs font-sans uppercase tracking-widest mb-1">Reserva</p>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-sans text-sm font-medium leading-tight">{attraction}</p>
                <p className="text-white/40 text-xs font-sans mt-0.5">PNR: {pnr}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-white font-sans text-xl font-semibold">${total}</p>
                <p className="text-white/40 text-xs font-sans">{currency}</p>
              </div>
            </div>
          </div>

          {/* ── FORM STEP ── */}
          {step === 'form' && (
            <form onSubmit={handlePay} className="px-6 pb-6 space-y-4">

              {/* Payment method */}
              <div>
                <p className="text-white/60 text-xs font-sans uppercase tracking-widest mb-2">Método de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 1, label: 'Crédito' },
                    { id: 2, label: 'Débito' },
                    { id: 3, label: 'Transferencia' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`py-2 rounded-lg text-xs font-sans font-medium transition-all duration-200
                        ${method === m.id
                          ? 'bg-cominca-forest text-white shadow-lg shadow-cominca-forest/30'
                          : 'bg-white/10 text-white/60 hover:bg-white/15 hover:text-white'
                        }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card number */}
              <div>
                <label className="block text-white/60 text-xs font-sans uppercase tracking-widest mb-1.5">
                  Número de tarjeta
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  onChange={e => setCard(c => ({ ...c, number: fmtCard(e.target.value) }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 font-sans text-sm tracking-widest focus:outline-none focus:border-cominca-forest focus:bg-white/15 transition-all"
                />
              </div>

              {/* Cardholder name */}
              <div>
                <label className="block text-white/60 text-xs font-sans uppercase tracking-widest mb-1.5">
                  Nombre en la tarjeta
                </label>
                <input
                  type="text"
                  placeholder="MARÍA GARCÍA"
                  value={card.name}
                  onChange={e => setCard(c => ({ ...c, name: e.target.value.toUpperCase() }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 font-sans text-sm uppercase tracking-wider focus:outline-none focus:border-cominca-forest focus:bg-white/15 transition-all"
                />
              </div>

              {/* Expiry + CVC */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/60 text-xs font-sans uppercase tracking-widest mb-1.5">
                    Vencimiento
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={card.expiry}
                    onChange={e => setCard(c => ({ ...c, expiry: fmtExpiry(e.target.value) }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 font-sans text-sm focus:outline-none focus:border-cominca-forest focus:bg-white/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-sans uppercase tracking-widest mb-1.5">
                    CVC
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="• • •"
                    value={card.cvc}
                    onChange={e => setCard(c => ({ ...c, cvc: fmtCvc(e.target.value) }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 font-sans text-sm focus:outline-none focus:border-cominca-forest focus:bg-white/15 transition-all"
                  />
                </div>
              </div>

              {/* Security notice */}
              <p className="text-white/30 text-xs font-sans text-center">
                🔒 Simulación segura · Los datos no se almacenan
              </p>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl font-sans font-semibold text-sm text-white transition-all duration-200
                  bg-gradient-to-r from-cominca-forest to-emerald-600 hover:from-emerald-600 hover:to-cominca-forest
                  shadow-lg shadow-cominca-forest/30 hover:shadow-cominca-forest/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                Pagar ${total} {currency}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-white/30 hover:text-white/60 text-xs font-sans transition-colors"
              >
                Cancelar
              </button>
            </form>
          )}

          {/* ── PROCESSING STEP ── */}
          {step === 'processing' && (
            <div className="px-6 pb-8 flex flex-col items-center gap-4">
              <img src={nekoGif} alt="Procesando…" className="w-28 h-28 object-contain" />
              <div className="flex items-center gap-3">
                <div className="relative w-5 h-5 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cominca-forest animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-white font-sans font-medium">Verificando con el banco…</p>
                  <p className="text-white/40 text-xs font-sans mt-0.5">Por favor espera, no cierres esta ventana</p>
                </div>
              </div>
            </div>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === 'success' && (
            <div className="px-6 pb-7 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-cominca-forest/20 border border-cominca-forest/40 flex items-center justify-center">
                <span className="text-3xl animate-fadeIn">✅</span>
              </div>
              <div className="text-center">
                <p className="text-white font-serif text-xl font-light">¡Pago aprobado!</p>
                <p className="text-white/50 text-sm font-sans mt-1">Tu reserva está confirmada</p>
              </div>
              <div className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/12 space-y-1">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-white/50">PNR</span>
                  <span className="text-white font-mono font-bold">{pnr}</span>
                </div>
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-white/50">Total pagado</span>
                  <span className="text-white font-medium">${total} {currency}</span>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-sans text-white/60 bg-white/10 hover:bg-white/15 transition-colors"
                >
                  Volver al inicio
                </button>
                <button
                  onClick={() => { onSuccess?.(); onClose() }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-sans text-white font-medium bg-cominca-forest hover:bg-cominca-forest/80 transition-colors"
                >
                  Ver mis reservas
                </button>
              </div>
            </div>
          )}

          {/* ── ERROR STEP ── */}
          {step === 'error' && (
            <div className="px-6 pb-7 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>
              <div className="text-center">
                <p className="text-white font-serif text-xl font-light">Pago rechazado</p>
                <p className="text-red-400 text-xs font-sans mt-1">{error}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-sans text-white/60 bg-white/10 hover:bg-white/15 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => { setStep('form'); setError(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-sans text-white font-medium bg-cominca-forest hover:bg-cominca-forest/80 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
