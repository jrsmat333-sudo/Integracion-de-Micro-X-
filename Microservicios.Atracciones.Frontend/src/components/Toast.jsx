import { useEffect } from 'react'

// ── Icons ────────────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l4 4 6-6" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M14 6l-8 8" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const isSuccess = type === 'success'

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-toastIn">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 text-sm font-sans shadow-lg
          ${isSuccess
            ? 'bg-cominca-forest text-white'
            : 'bg-cominca-charcoal text-white'
          }`}
      >
        {isSuccess ? <IconCheck /> : <IconX />}
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        >
          <IconX />
        </button>
      </div>
    </div>
  )
}
