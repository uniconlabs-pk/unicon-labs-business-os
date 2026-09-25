'use client'

import { useState } from 'react'

interface SecurityGateModalProps {
  businessId: string
  requiredModule?: string
  onAuthenticated: (staff: any) => void
  onCancel?: () => void
}

export default function SecurityGateModal({ businessId, requiredModule, onAuthenticated, onCancel }: SecurityGateModalProps) {
  const [mode, setMode] = useState<'pin' | 'tech'>('pin')
  const [pin, setPin] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [techTokenInput, setTechTokenInput] = useState('')

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, pin, requiredModule })
      })
      const data = await res.json()
      if (res.ok && data.staff) {
        onAuthenticated(data.staff)
      } else {
        setErrorMsg(data.error || 'Invalid Staff PIN or Badge')
      }
    } catch (err) {
      setErrorMsg('Authentication service error')
    } finally {
      setLoading(false)
      setPin('') // Clear input on failure for quick rescan
    }
  }

  const handleTechVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/control-plane/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeToken: techTokenInput.trim(), businessId })
      })
      const data = await res.json()
      if (res.ok && data.valid && data.session) {
        onAuthenticated(data.session)
      } else {
        setErrorMsg(data.error || 'Invalid or expired tech challenge token')
      }
    } catch (err) {
      setErrorMsg('Control plane validation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-200">
        
        <div className="bg-slate-900 text-white p-6 pb-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Security Gate</span>
            {onCancel && (
              <button onClick={onCancel} className="text-gray-400 hover:text-white text-xs font-bold">✕ Exit</button>
            )}
          </div>
          <h2 className="text-lg font-black uppercase tracking-wide">
            {mode === 'pin' ? 'Staff Terminal Access' : '🛠️ Unicon Tech Break-Glass'}
          </h2>

          <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode('pin'); setErrorMsg(''); setPin(''); }}
              className={`py-1.5 rounded-lg transition ${mode === 'pin' ? 'bg-slate-700 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Staff PIN / Badge
            </button>
            <button
              type="button"
              onClick={() => { setMode('tech'); setErrorMsg(''); }}
              className={`py-1.5 rounded-lg transition ${mode === 'tech' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Field Tech QR / Token
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Enter PIN or Scan Badge</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center font-mono font-black text-lg tracking-widest text-gray-900 focus:outline-none focus:border-slate-900"
                  autoFocus
                />
              </div>
              {errorMsg && <p className="text-rose-600 text-xs font-bold text-center">{errorMsg}</p>}
              <button
                type="submit"
                disabled={loading || pin.length < 3}
                className="w-full py-3 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wide transition shadow-md"
              >
                {loading ? 'Verifying...' : 'Unlock Terminal'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTechVerify} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 font-medium">
                ⚠️ Scoped diagnostic override active. Session is audited under your Unicon tech ID and TTL-bounded.
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">Paste Base64 Token / Scan Optical QR</label>
                <textarea
                  rows={3}
                  value={techTokenInput}
                  onChange={(e) => setTechTokenInput(e.target.value)}
                  placeholder="eyJ0ZWNoSWQiOiJURUNILTAwMSIs..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-mono text-[11px] text-gray-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              {errorMsg && <p className="text-rose-600 text-xs font-bold text-center">{errorMsg}</p>}
              <button
                type="submit"
                disabled={loading || !techTokenInput.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wide transition shadow-md"
              >
                {loading ? 'Validating Challenge...' : 'Activate Diagnostic Session'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}