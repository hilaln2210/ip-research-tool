import { useState } from 'react'

const API = '/api'

const SCORE_COLOR = s => s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444'
const TYPE_ICON = t => {
  if (!t) return '?'
  if (t.includes('Proxy') || t.includes('VPN')) return '🔒'
  if (t.includes('Datacenter') || t.includes('CDN')) return '🏢'
  if (t.includes('Mobile')) return '📱'
  if (t.includes('CGNAT')) return '🔀'
  if (t.includes('Private')) return '🏠'
  return '🌐'
}

export default function BulkAnalyzer() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')

  async function analyze() {
    const ips = text.split(/[\n,\s]+/).map(s => s.trim()).filter(s => s)
    if (!ips.length) return
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const r = await fetch(`${API}/bulk?reputation=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: ips.slice(0, 20) }),
      })
      if (!r.ok) throw new Error((await r.json()).detail || r.statusText)
      const data = await r.json()
      setResults(data.results || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ color: '#38bdf8', marginBottom: 8, fontSize: 18 }}>Bulk IP Scanner</h2>
      <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Paste up to 20 IPs (one per line, comma or space separated). Classification only — no reputation lookup.
      </p>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={"8.8.8.8\n1.1.1.1\n192.168.1.1"}
        rows={6}
        style={{
          width: '100%', padding: 14, borderRadius: 8,
          border: '1px solid #334155', background: '#1e293b',
          color: '#e2e8f0', fontSize: 14, fontFamily: 'monospace',
          outline: 'none', resize: 'vertical', marginBottom: 12,
        }}
      />
      <button
        onClick={analyze}
        disabled={loading}
        style={{
          padding: '10px 28px', borderRadius: 8, border: 'none',
          background: '#38bdf8', color: '#0f1117', fontWeight: 700,
          fontSize: 14, cursor: loading ? 'wait' : 'pointer', marginBottom: 24,
        }}
      >
        {loading ? 'Scanning...' : 'Scan All'}
      </button>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #b91c1c', borderRadius: 8, padding: 14, color: '#fca5a5', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{results.length} results</span>
            <button
              onClick={() => {
                const headers = 'IP,Type,ISP,Score,Attribution,Country\n'
                const rows = results
                  .filter(r => !r.error)
                  .map(r => [r.ip, r.ip_type, (r.network?.isp || r.network?.org || r.network?.asn_name || '').replace(/,/g, ';'), r.uniqueness_score ?? '', r.attribution_reliability ?? '', r.geo?.country ?? ''])
                  .map(row => row.map(cell => `"${String(cell)}"`).join(','))
                  .join('\n')
                const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `ip-research-${new Date().toISOString().slice(0, 10)}.csv`
                a.click()
                URL.revokeObjectURL(a.href)
              }}
              style={{
                padding: '6px 14px', borderRadius: 6, border: '1px solid #334155',
                background: '#1e293b', color: '#94a3b8', fontSize: 12, cursor: 'pointer',
              }}
            >
              📥 Export CSV
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 220px', gap: 8, padding: '8px 14px', fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            <span>IP</span><span>Type</span><span>ISP / Org</span><span>Score</span><span>Attribution</span>
          </div>
          {results.map((r, i) => (
            r.error ? (
              <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px', color: '#f87171', fontSize: 13 }}>
                {r.ip}: {r.error}
              </div>
            ) : (
              <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 220px', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: 14 }}>{r.ip}</span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>{TYPE_ICON(r.ip_type)} {r.ip_type}</span>
                <span style={{ color: '#64748b', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.network?.isp || r.network?.org || r.network?.asn_name || '—'}
                </span>
                <span style={{ color: SCORE_COLOR(r.uniqueness_score ?? 0), fontWeight: 700, fontSize: 16 }}>
                  {r.uniqueness_score ?? '?'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{r.attribution_reliability}</span>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
