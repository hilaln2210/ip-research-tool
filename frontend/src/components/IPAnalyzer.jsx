import { useState } from 'react'
import ScoreGauge from './ScoreGauge'
import FlagBadge from './FlagBadge'
import ReputationPanel from './ReputationPanel'

const API = 'http://localhost:8000/api'

export default function IPAnalyzer() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  async function analyze() {
    const ip = input.trim()
    if (!ip) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const r = await fetch(`${API}/analyze/${encodeURIComponent(ip)}?reputation=true`)
      if (!r.ok) {
        const e = await r.json()
        throw new Error(e.detail || r.statusText)
      }
      setData(await r.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 style={{ color: '#38bdf8', marginBottom: 20, fontSize: 18 }}>Analyze IP Address</h2>

      <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="e.g. 8.8.8.8"
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 8,
            border: '1px solid #334155', background: '#1e293b',
            color: '#e2e8f0', fontSize: 15, outline: 'none',
          }}
        />
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            padding: '10px 28px', borderRadius: 8, border: 'none',
            background: '#38bdf8', color: '#0f1117', fontWeight: 700,
            fontSize: 15, cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #b91c1c', borderRadius: 8, padding: 16, color: '#fca5a5', marginBottom: 20 }}>
          {error}
        </div>
      )}

      {data && <ResultCard data={data} />}
    </div>
  )
}

function ResultCard({ data }) {
  const score = data.uniqueness_score ?? 0
  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Warning banner */}
      {data._warning && (
        <div style={{ background: '#431407', border: '1px solid #ea580c', borderRadius: 8, padding: 14, color: '#fdba74', fontSize: 13 }}>
          <strong>Warning:</strong> {data._warning}
        </div>
      )}

      {/* Top row: score + overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
        <ScoreGauge score={score} color={scoreColor} label="Uniqueness Score" />
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{data.ip}</div>
          <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 12 }}>{data.ip_type}</div>
          <div style={{ fontSize: 13, color: scoreColor, fontWeight: 600, marginBottom: 12 }}>{data.attribution_reliability}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.flags?.is_proxy && <FlagBadge label="Proxy/VPN" color="#7c3aed" />}
            {data.flags?.is_hosting && <FlagBadge label="Hosting" color="#1d4ed8" />}
            {data.flags?.is_mobile && <FlagBadge label="Mobile" color="#0369a1" />}
            {data.flags?.is_cgnat && <FlagBadge label="CGNAT" color="#b45309" />}
            {data.flags?.is_private && <FlagBadge label="Private" color="#374151" />}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {data.reasons?.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Why this score</div>
          <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.reasons.map((r, i) => (
              <li key={i} style={{ color: '#cbd5e1', fontSize: 13 }}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Network + Geo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <InfoBlock title="Network" rows={[
          ['ASN', data.network?.asn],
          ['ASN Name', data.network?.asn_name],
          ['CIDR', data.network?.cidr],
          ['ISP', data.network?.isp],
          ['Org', data.network?.org],
          ['Network', data.network?.network_name],
        ]} />
        <InfoBlock title="Geolocation" rows={[
          ['Country', `${data.geo?.country} (${data.geo?.country_code})`],
          ['Region', data.geo?.region],
          ['City', data.geo?.city],
          ['Reverse DNS', data.reverse_dns || '—'],
        ]} />
      </div>

      {/* Reputation */}
      {data.reputation && <ReputationPanel rep={data.reputation} />}
    </div>
  )
}

function InfoBlock({ title, rows }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.filter(([, v]) => v).map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{label}</span>
            <span style={{ color: '#e2e8f0', textAlign: 'right', wordBreak: 'break-all' }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
