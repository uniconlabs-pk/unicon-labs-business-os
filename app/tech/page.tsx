'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { QRCodeSVG } from 'qrcode.react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function TechPage() {
  const [mounted, setMounted] = useState(false)
  const [tenants, setTenants] = useState<any[]>([
    { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Krunchy Bite (krunchy-bite)' }
  ])
  const [selectedTenant, setSelectedTenant] = useState<string>('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
  const [code, setCode] = useState<string>('WSD9J7')
  const [timeLeft, setTimeLeft] = useState<number>(300)

  useEffect(() => {
    setMounted(true)
    async function fetchTenants() {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, slug')
          .order('name', { ascending: true })

        if (!error && data && data.length > 0) {
          setTenants(data)
          setSelectedTenant(data[0].id)
        }
      } catch (err) {
        console.warn('Using fallback workspace list:', err)
      }
    }
    fetchTenants()
  }, [])

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const generateNewCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setCode(result)
    setTimeLeft(300)
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Stable deterministic payload for SSR, dynamic client-side if needed
  const qrPayload = JSON.stringify({
    tenantId: selectedTenant,
    code: code
  })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc',
      padding: '24px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', letterSpacing: '2px', color: '#38bdf8', fontWeight: 700 }}>UNICON LABS</span>
          <h1 style={{ fontSize: '22px', margin: '4px 0 0 0', fontWeight: 700 }}>Tech PWA Console</h1>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '20px'
        }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>
            TARGET TENANT WORKSPACE
          </label>
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: '#090d16',
              color: '#fff',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none'
            }}
          >
            {tenants.map((t: any) => (
              <option key={t.id} value={t.id} style={{ background: '#090d16', color: '#fff' }}>
                {t.name} {t.slug ? `(${t.slug})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          padding: '28px 20px',
          textAlign: 'center',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            display: 'inline-block',
            marginBottom: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            minHeight: '140px',
            displayFlex: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {mounted ? (
              <QRCodeSVG 
                value={qrPayload}
                size={140}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            ) : (
              <div style={{ width: 140, height: 140, background: '#f1f5f9', borderRadius: 8 }} />
            )}
          </div>

          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', fontWeight: 500 }}>
            ACTIVE ROLLING CHALLENGE CODE
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: 800,
            letterSpacing: '8px',
            color: '#38bdf8',
            fontFamily: 'monospace',
            margin: '16px 0',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px dashed rgba(56, 189, 248, 0.3)'
          }}>
            {code}
          </div>
          <div style={{
            display: 'inline-block',
            padding: '6px 14px',
            background: timeLeft < 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: timeLeft < 60 ? '#f87171' : '#34d399',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '24px'
          }}>
            Expires in {formatTime(timeLeft)}
          </div>
          <button
            onClick={generateNewCode}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
            }}
          >
            Generate New Code
          </button>
        </div>
      </div>
    </div>
  )
}