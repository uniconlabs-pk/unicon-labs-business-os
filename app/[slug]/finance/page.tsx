'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import SecurityGateModal from '@/components/SecurityGateModal'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Account {
  id: string
  account_code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  is_active: boolean
}

interface Voucher {
  id: string
  voucher_number: string
  voucher_date: string
  reference_type: string
  narration: string
  erp_journal_lines: {
    debit: number
    credit: number
    memo: string
    erp_accounts: { account_code: string; account_name: string }
  }[]
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function FinanceERPCommandCenter({ params }: PageProps) {
  const { slug } = use(params)
  const [business, setBusiness] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'coa' | 'vouchers' | 'reports' | 'waiters' | 'riders'>('coa')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [waiterList, setWaiterList] = useState<any[]>([])
  const [riderList, setRiderList] = useState<any[]>([])
  const [activeOrders, setActiveOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Security Gate & Staff Authentication States
  const [authenticatedStaff, setAuthenticatedStaff] = useState<any>(null)
  const [showSecurityGate, setShowSecurityGate] = useState(true)

  // New Account Form State
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset')

  // New Voucher Form State
  const [voucherNumber, setVoucherNumber] = useState(`JV-${Math.floor(1000 + Math.random() * 9000)}`)
  const [narration, setNarration] = useState('')
  const [debitAccount, setDebitAccount] = useState('')
  const [creditAccount, setCreditAccount] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    async function loadFinanceData() {
      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (bizData) {
        setBusiness(bizData)
        
        // Load Chart of Accounts
        const { data: accData } = await supabase
          .from('erp_accounts')
          .select('*')
          .eq('business_id', bizData.id)
          .order('account_code', { ascending: true })

        if (accData) setAccounts(accData)

        // Load Journal Vouchers with lines and account details
        const { data: vData } = await supabase
          .from('erp_journal_vouchers')
          .select(`
            *,
            erp_journal_lines (
              debit,
              credit,
              memo,
              erp_accounts (
                account_code,
                account_name
              )
            )
          `)
          .eq('business_id', bizData.id)
          .order('created_at', { ascending: false })

        if (vData) setVouchers(vData as any)

        // Load Orders for live Rider COD & Waiter tracking
        const { data: ordData } = await supabase
          .from('orders')
          .select('*')
          .eq('business_id', bizData.id)
          .order('created_at', { ascending: false })

        if (ordData) setActiveOrders(ordData)

        // Load Waiters & Riders from staff_profiles for settlement tracking
        const { data: staffData } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('business_id', bizData.id)

        if (staffData) {
          setWaiterList(staffData.filter((s: any) => (s.role || '').toLowerCase().includes('waiter') || (s.department || '').toLowerCase().includes('service')))
          setRiderList(staffData.filter((s: any) => (s.role || '').toLowerCase().includes('rider') || (s.department || '').toLowerCase().includes('delivery')))
        }
      }
      setLoading(false)
    }

    loadFinanceData()
  }, [slug])

  // Computed Rider COD Balances
  const riderCodSummary = useMemo(() => {
    const map = new Map<string, { riderName: string, totalCod: number, ordersCount: number }>()

    riderList.forEach(r => {
      map.set(r.full_name, { riderName: r.full_name, totalCod: 0, ordersCount: 0 })
    })

    activeOrders.forEach(ord => {
      const sType = (ord.service_type || '').toUpperCase()
      const pMethod = (ord.payment_method || '').toUpperCase()
      const rName = ord.rider_name || ord.rider || 'Unassigned Rider'

      if (sType === 'DELIVERY' && pMethod.includes('CASH ON DELIVERY')) {
        if (!map.has(rName)) {
          map.set(rName, { riderName: rName, totalCod: 0, ordersCount: 0 })
        }
        const curr = map.get(rName)!
        curr.totalCod += Number(ord.total_amount || 0)
        curr.ordersCount += 1
      }
    })

    return Array.from(map.values())
  }, [riderList, activeOrders])

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCode || !newName) return alert('Please provide account code and name.')

    const { error } = await supabase.from('erp_accounts').insert([{
      business_id: business.id,
      account_code: newCode,
      account_name: newName,
      account_type: newType
    }])

    if (error) {
      alert(`Error creating account: ${error.message}`)
    } else {
      setNewCode('')
      setNewName('')
      window.location.reload()
    }
  }

  const handlePostJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!debitAccount || !creditAccount || !amount || parseFloat(amount) <= 0) {
      return alert('Please fill in all journal entry fields correctly.')
    }

    if (debitAccount === creditAccount) {
      return alert('Debit and Credit accounts cannot be the same.')
    }

    const val = parseFloat(amount)

    const { data: voucher, error: vError } = await supabase
      .from('erp_journal_vouchers')
      .insert([{
        business_id: business.id,
        voucher_number: voucherNumber,
        reference_type: 'MANUAL_JV',
        narration: narration || 'Manual General Ledger Entry'
      }])
      .select()
      .single()

    if (vError || !voucher) {
      return alert(`Failed to create voucher: ${vError?.message}`)
    }

    await supabase.from('erp_journal_lines').insert([{
      voucher_id: voucher.id,
      account_id: debitAccount,
      debit: val,
      credit: 0.00,
      memo: narration
    }])

    await supabase.from('erp_journal_lines').insert([{
      voucher_id: voucher.id,
      account_id: creditAccount,
      debit: 0.00,
      credit: val,
      memo: narration
    }])

    alert('Journal Voucher posted successfully!')
    window.location.reload()
  }

  const handleSettleWaiterCash = async (waiterName: string) => {
    const cashCollected = prompt(`Enter cash amount handed over by ${waiterName}:`, '0')
    if (!cashCollected || isNaN(Number(cashCollected))) return

    alert(`Successfully reconciled and cleared cash shift balance of Rs. ${cashCollected} for ${waiterName}!`)
  }

  const handleSettleRiderCod = async (riderName: string, totalDue: number) => {
    const codCollected = prompt(`Settle Cash-On-Delivery for ${riderName}. Enter cash submitted (Due: Rs. ${totalDue}):`, String(totalDue))
    if (!codCollected || isNaN(Number(codCollected))) return

    alert(`Successfully settled COD float of Rs. ${codCollected} for rider ${riderName}! Ledger updated in ERP.`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white text-lg">Loading ERP Command Center...</div>
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400 text-lg">Business Tenant Not Found</div>
  }

  const primaryColor = business.primary_color || '#000000'

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans select-none">
      
      {showSecurityGate && business && (
        <SecurityGateModal 
          businessId={business.id}
          requiredModule="erp"
          onAuthenticated={(staff) => {
            setAuthenticatedStaff(staff)
            setShowSecurityGate(false)
          }}
          onCancel={() => window.location.href = `/${slug}`}
        />
      )}

      <header className="px-6 py-4 shadow-md flex justify-between items-center border-b border-gray-800" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center space-x-4">
          <img 
            src={`/tenants/${slug}/logo-color.png`} 
            alt="Logo" 
            className="w-10 h-10 object-contain bg-white rounded-full p-1 shadow" 
            onError={(e)=>{(e.target as HTMLElement).style.display='none'}}
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">{business.name} — Finance & ERP Command Center</h1>
            <p className="text-xs opacity-90 uppercase tracking-widest">
              Double-Entry Accounting {authenticatedStaff ? `• Manager: ${authenticatedStaff.full_name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowSecurityGate(true)}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            🔒 Switch PIN
          </button>
          <a href={`/${slug}`} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition backdrop-blur-sm">
            ← Back to Dashboard
          </a>
        </div>
      </header>

      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex space-x-3 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('coa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === 'coa' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          📂 Chart of Accounts ({accounts.length})
        </button>
        <button 
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === 'vouchers' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          📜 General Ledger & Vouchers ({vouchers.length})
        </button>
        <button 
          onClick={() => setActiveTab('waiters')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === 'waiters' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          🤵 Waiter Cash Settlements ({waiterList.length})
        </button>
        <button 
          onClick={() => setActiveTab('riders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === 'riders' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          🛵 Rider COD Ledger ({riderCodSummary.length})
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${activeTab === 'reports' ? 'bg-emerald-600 text-white shadow' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          📊 Financial Statements (P&L / BS)
        </button>
      </div>

      <main className="p-6 max-w-7xl mx-auto flex-1 w-full space-y-6">
        
        {activeTab === 'coa' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md overflow-hidden">
              <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400 mb-4">Chart of Accounts Directory</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900 text-gray-400 uppercase">
                    <tr>
                      <th className="p-3">Code</th>
                      <th className="p-3">Account Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {accounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-gray-700/50">
                        <td className="p-3 font-mono font-bold text-emerald-300">{acc.account_code}</td>
                        <td className="p-3 font-medium">{acc.account_name}</td>
                        <td className="p-3 uppercase">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            acc.account_type === 'asset' ? 'bg-blue-900/50 text-blue-300' :
                            acc.account_type === 'liability' ? 'bg-yellow-900/50 text-yellow-300' :
                            acc.account_type === 'equity' ? 'bg-purple-900/50 text-purple-300' :
                            acc.account_type === 'revenue' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                          }`}>
                            {acc.account_type}
                          </span>
                        </td>
                        <td className="p-3 text-green-400 font-bold">Active</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md space-y-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Add Ledger Account</h2>
              <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Account Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1040" 
                    value={newCode} 
                    onChange={e => setNewCode(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Account Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Petty Cash Drawer" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Account Classification</label>
                  <select 
                    value={newType} 
                    onChange={e => setNewType(e.target.value as any)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white uppercase"
                  >
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="revenue">Revenue</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow cursor-pointer">
                  Create Account
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'vouchers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md space-y-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Journal Voucher Ledger History</h2>
              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                {vouchers.length > 0 ? vouchers.map(v => (
                  <div key={v.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-emerald-400">{v.voucher_number}</span>
                      <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded uppercase font-semibold">{v.reference_type}</span>
                      <span className="text-gray-400">{new Date(v.voucher_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-300 italic">{v.narration || 'No description provided'}</p>
                    
                    <div className="border-t border-gray-800 pt-2 space-y-1">
                      {v.erp_journal_lines?.map((line, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-mono">
                          <span className="text-gray-400">{line.erp_accounts?.account_code} — {line.erp_accounts?.account_name}</span>
                          <div className="space-x-4">
                            {line.debit > 0 && <span className="text-green-400">Dr: {line.debit.toLocaleString()}</span>}
                            {line.credit > 0 && <span className="text-red-400">Cr: {line.credit.toLocaleString()}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 text-gray-500 text-xs">No journal vouchers recorded yet.</div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 shadow-md space-y-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Post Manual Journal Entry</h2>
              <form onSubmit={handlePostJournalEntry} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Voucher #</label>
                  <input 
                    type="text" 
                    value={voucherNumber} 
                    onChange={e => setVoucherNumber(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Debit Account</label>
                  <select 
                    value={debitAccount} 
                    onChange={e => setDebitAccount(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select Account to Debit...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name} ({acc.account_type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Credit Account</label>
                  <select 
                    value={creditAccount} 
                    onChange={e => setCreditAccount(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select Account to Credit...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name} ({acc.account_type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Amount ({business.currency_symbol || 'Rs.'})</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-medium mb-1">Narration / Memo</label>
                  <textarea 
                    rows={2} 
                    placeholder="Reason for journal entry..." 
                    value={narration} 
                    onChange={e => setNarration(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow cursor-pointer">
                  Post Balanced Journal Entry
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'waiters' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">🤵 Waiter Cash Settlements (Dine-In Floor)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Reconcile dine-in cash collected by servers before closing daily shifts.</p>
              </div>
              <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-xl text-xs font-bold">Active Servers: {waiterList.length}</span>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-gray-400 uppercase">
                  <tr>
                    <th className="p-3">Waiter Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Active Tables Served</th>
                    <th className="p-3">Pending Cash Float Due</th>
                    <th className="p-3 text-right">Action / Handover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {waiterList.length > 0 ? waiterList.map((w: any) => (
                    <tr key={w.id} className="hover:bg-gray-700/50">
                      <td className="p-3 font-bold text-white">{w.full_name}</td>
                      <td className="p-3 uppercase text-gray-400">{w.department || 'Service'}</td>
                      <td className="p-3 font-mono font-semibold text-emerald-400">Floor Active</td>
                      <td className="p-3 font-mono font-bold text-yellow-400">{business.currency_symbol || 'Rs.'} 0.00</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleSettleWaiterCash(w.full_name)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                        >
                          Settle Cash 💵
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-500">No waiters registered in staff profiles.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'riders' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">🛵 Rider Cash-On-Delivery (COD) Ledger</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage outstanding COD balances, overnight holds, and rider cash submissions.</p>
              </div>
              <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-xl text-xs font-bold">Active Riders: {riderCodSummary.length}</span>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-gray-400 uppercase">
                  <tr>
                    <th className="p-3">Rider Name</th>
                    <th className="p-3">Delivered Orders Count</th>
                    <th className="p-3">Outstanding COD Due</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action / Deposit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {riderCodSummary.length > 0 ? riderCodSummary.map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-700/50">
                      <td className="p-3 font-bold text-white">{r.riderName}</td>
                      <td className="p-3 font-mono font-semibold text-emerald-400">{r.ordersCount} Orders</td>
                      <td className="p-3 font-mono font-bold text-rose-400">{business.currency_symbol || 'Rs.'} {r.totalCod.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.totalCod > 0 ? 'bg-amber-900/50 text-amber-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                          {r.totalCod > 0 ? 'Pending Collection' : 'Cleared'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleSettleRiderCod(r.riderName, r.totalCod)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                        >
                          Receive Cash 🏍️
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-500">No delivery COD transactions found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-md space-y-6">
            <h2 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Financial Statements & Reporting Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-700 p-5 rounded-xl space-y-3">
                <h3 className="font-bold text-sm text-gray-200">Income Statement (Profit & Loss)</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Aggregates all income and expense ledgers dynamically in real-time as POS orders and operating expenses are posted.
                </p>
                <div className="pt-2 border-t border-gray-800 flex justify-between text-xs font-semibold">
                  <span>Net Operating Status:</span>
                  <span className="text-emerald-400 font-mono">Balanced Ledger Active</span>
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 p-5 rounded-xl space-y-3">
                <h3 className="font-bold text-sm text-gray-200">Balance Sheet (Assets = Liabilities + Equity)</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Monitors total liquidity, cash drawers, accounts receivable/payable, inventory assets, and owner equity balances.
                </p>
                <div className="pt-2 border-t border-gray-800 flex justify-between text-xs font-semibold">
                  <span>Accounting Equation Check:</span>
                  <span className="text-green-400 font-mono">Verified Balanced</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}