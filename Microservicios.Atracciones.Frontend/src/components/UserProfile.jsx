import { useState, useEffect } from 'react'
import { getClientById, updateClient } from '../services/api'
import Toast from './Toast'

// ── Icons ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg className="w-12 h-12 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg className="w-3.5 h-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  )
}

// ── Sidebar tab item ─────────────────────────────────────────────────────────

function SideTab({ label, active, onClick, decorative }) {
  return (
    <button
      onClick={onClick}
      disabled={decorative}
      className={`w-full flex items-center justify-between px-5 py-3 text-sm font-sans transition-all duration-150
        ${active
          ? 'bg-cominca-forest/20 text-white font-medium'
          : decorative
            ? 'text-white/30 cursor-default'
            : 'text-white/60 hover:bg-white/5 hover:text-white/90'
        }`}
    >
      <span>{label}</span>
      {!decorative && <IconArrow />}
    </button>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div>
      <label className="label-elegant block mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS = ['Personal details', 'Notifications', 'Saved Cards']

export default function UserProfile({ user, onClose }) {
  const [activeTab, setActiveTab] = useState('Personal details')
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', birthdate: '' })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [toast, setToast] = useState(null)

  // Load client data on mount
  useEffect(() => {
    if (!user?.id) return
    setFetching(true)
    getClientById(user.id)
      .then(data => {
        if (data) {
          const d = data.data ?? data
          setForm({
            firstName: d.firstName || d.first_name || '',
            lastName:  d.lastName  || d.last_name  || '',
            phone:     d.phone     || '',
            birthdate: d.birthdate ? d.birthdate.split('T')[0] : '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false))
  }, [user?.id])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await updateClient(user.id, form)
      setToast({ message: 'Perfil actualizado correctamente', type: 'success' })
    } catch (err) {
      setToast({ message: err.message || 'Error al guardar', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-cominca-cream flex animate-fadeIn">

      {/* ── Left sidebar ───────────────────────────────────────────────── */}
      <aside className="w-64 bg-cominca-charcoal flex flex-col shrink-0">

        {/* Avatar area */}
        <div className="flex flex-col items-center pt-12 pb-8 px-6 border-b border-white/10">
          <div className="w-20 h-20 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-4">
            <IconUser />
          </div>
          <p className="font-serif text-white text-xl font-light text-center leading-tight">
            {form.firstName ? `${form.firstName} ${form.lastName}` : (user?.email || 'Mi cuenta')}
          </p>
          <p className="text-xs font-sans text-white/40 mt-1 truncate max-w-full px-2">
            {user?.email}
          </p>
        </div>

        {/* Tabs */}
        <nav className="flex-1 pt-4">
          {TABS.map(tab => (
            <SideTab
              key={tab}
              label={tab}
              active={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              decorative={tab !== 'Personal details'}
            />
          ))}
        </nav>

        {/* Close */}
        <div className="p-5 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full text-sm font-sans text-white/40 hover:text-white/70 transition-colors text-left"
          >
            ← Volver al inicio
          </button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-12 py-12">
        <div className="max-w-xl">

          <div className="mb-8">
            <p className="label-elegant mb-1">Mi cuenta</p>
            <h1 className="font-serif text-3xl font-light text-cominca-charcoal">
              {activeTab}
            </h1>
          </div>

          {activeTab === 'Personal details' && (
            fetching ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-8 bg-cominca-border/50 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-7">

                <div className="grid grid-cols-2 gap-6">
                  <Field label="Nombre">
                    <input
                      type="text" value={form.firstName} onChange={set('firstName')}
                      placeholder="María" className="input-elegant"
                    />
                  </Field>
                  <Field label="Apellido">
                    <input
                      type="text" value={form.lastName} onChange={set('lastName')}
                      placeholder="García" className="input-elegant"
                    />
                  </Field>
                </div>

                <Field label="Teléfono">
                  <input
                    type="tel" value={form.phone} onChange={set('phone')}
                    placeholder="+593 99 999 9999" className="input-elegant"
                  />
                </Field>

                <Field label="Fecha de nacimiento">
                  <input
                    type="date" value={form.birthdate} onChange={set('birthdate')}
                    className="input-elegant"
                  />
                </Field>

                <div className="pt-2">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            )
          )}

          {activeTab !== 'Personal details' && (
            <div className="flex items-center justify-center py-24 text-cominca-sand">
              <p className="font-serif text-2xl font-light italic">Próximamente</p>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
