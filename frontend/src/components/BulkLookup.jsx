import { useState } from 'react'

export default function BulkLookup() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function analyze() {
    const ips = input.split(/[
,\s]+/).map(s => s.trim()).filter(Boolean)
    if (!ips.length) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips: ips.slice(0, 20) }),
      })
      if (!r.ok) throw new Error('Bulk request failed')
      setResults(await r.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const scoreColor = (s) => s >= 70 ? '#f0883e' : s >= 40 ? '#d29922' : '#3fb950'

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={'Paste IPs, one per line or comma-separated (max 20)
8.8.8.8
1.1.1.1
...'}
          rows={6}
          style={{
            width: '100%', padding: '10px 14px',
            background: '#161b22', border: '1px solid #30363d',
            borderRadius: 6, color: '#e6edf3', fontSize: 14,
            fontFamily: 'monospace', resize: 'vertical', outline: 'none',
          }}
        />
      </div>
      <button
        onClick={analyze}
        disabled={loading}
        style={{
          padding: '10px 24px', background: '#238636',
          border: 'none', borderRadius: 6, color: '#fff',
          cursor: 'pointer', fontWeight: 600, fontSize: 14,
          marginBottom: 24, opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Analyzing...' : 'Analyze All'}
      </button>

      {error && (
        <div style={{ color: '#f85149', marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}

      {results.length > 0 && (
        <div style={{
          background: '#161b22', border: '1px solid #30363d',
          borderRadius: 8, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#21262d' }}>
                {['IP', 'Type', 'Uniqueness', 'Country', 'ISP / Org', 'Flags'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left',
                    color: '#8b949e', fontWeight: 600, fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => {
                if (row.error) return (
                  <tr key={i} style={{ borderTop: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#f85149' }}>{row.ip}</td>
                    <td colSpan={5} style={{ padding: '10px 14px', color: '#f85149' }}>{row.error}</td>
                  </tr>
                )
                const sc = row.uniqueness_score
                const f = row.flags || {}
                const flagList = [
                  f.is_proxy && 'Proxy/VPN',
                  f.is_hosting && 'Hosting',
                  f.is_mobile && 'Mobile',
                  f.is_cgnat && 'CGNAT',
                  f.is_private && 'Private',
                ].filter(Boolean)
                return (
                  <tr key={i} style={{ borderTop: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#58a6ff' }}>{row.ip}</td>
                    <td style={{ padding: '10px 14px', color: '#e6edf3' }}>{row.ip_type}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ color: scoreColor(sc), fontWeight: 700 }}>{sc}</span>
                      <span style={{ color: '#484f58' }}>/100</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#8b949e' }}>
                      {row.geo?.country_code} {row.geo?.city}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#8b949e', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.network?.isp || row.network?.asn_name}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {flagList.map(f => (
                        <span key={f} style={{
                          marginRight: 4, padding: '2px 6px',
                          background: '#21262d', borderRadius: 4,
                          color: '#8b949e', fontSize: 11,
                        }}>{f}</span>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
