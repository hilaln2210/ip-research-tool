import { useState } from 'react'
import ScoreGauge from './ScoreGauge.jsx'
import FlagBadge from './FlagBadge.jsx'
import ReputationPanel from './ReputationPanel.jsx'

export default function IPLookup() {
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function lookup() {
    const ip = input.trim()
    if (\!ip) return
    setLoading(true)
    setError('')
    setData(null)
    try {
      const r = await fetch(`/api/analyze/${encodeURIComponent(ip)}`)
      if (\!r.ok) {
        const err = await r.json()
        throw new Error(err.detail || 'Lookup failed')
      }
      setData(await r.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') lookup()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='Enter an IP address (e.g. 8.8.8.8)'
          style={{
            flex: 1,
            padding: '10px 14px',
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 6,
            color: '#e6edf3',
            fontSize: 15,
            outline: 'none',
          }}
        />
        <button
          onClick={lookup}
          disabled={loading}
          style={{
            padding: '10px 24px',
            background: '#238636',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 14,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#1f1a1a', border: '1px solid #f85149', borderRadius: 6,
          padding: '12px 16px', color: '#f85149', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {data && <IPResult data={data} />}
    </div>
  )
}

function IPResult({ data }) {
  const { ip, ip_type, uniqueness_score, attribution_reliability, reasons, geo, network, flags, reverse_dns, reputation } = data

  const scoreColor = uniqueness_score >= 70 ? '#f0883e'
    : uniqueness_score >= 40 ? '#d29922'
    : '#3fb950'

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
        padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#58a6ff', fontFamily: 'monospace' }}>{ip}</div>
          <div style={{ fontSize: 14, color: '#8b949e', marginTop: 4 }}>{ip_type}</div>
          {reverse_dns && (
            <div style={{ fontSize: 12, color: '#6e7681', marginTop: 2 }}>PTR: {reverse_dns}</div>
          )}
        </div>
        <ScoreGauge score={uniqueness_score} label='Uniqueness Score' />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>ATTRIBUTION</div>
          <div style={{
            background: '#0d1117', border: `1px solid ${scoreColor}`,
            borderRadius: 6, padding: '6px 12px', color: scoreColor,
            fontSize: 12, fontWeight: 600, maxWidth: 220,
          }}>
            {attribution_reliability}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <InfoCard title='Geographic Location'>
          <Row label='Country' value={`${geo.country} (${geo.country_code})`} />
          <Row label='Region' value={geo.region} />
          <Row label='City' value={geo.city} />
        </InfoCard>
        <InfoCard title='Network / ASN'>
          <Row label='ASN' value={network.asn ? `AS${network.asn}` : ''} />
          <Row label='ASN Name' value={network.asn_name} />
          <Row label='CIDR' value={network.cidr} />
          <Row label='ISP' value={network.isp} />
          <Row label='Org' value={network.org} />
        </InfoCard>
      </div>

      <InfoCard title='Classification Flags'>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {flags.is_proxy && <FlagBadge label='Proxy / VPN' color='#f85149' />}
          {flags.is_hosting && <FlagBadge label='Hosting / Datacenter' color='#d29922' />}
          {flags.is_mobile && <FlagBadge label='Mobile Carrier' color='#58a6ff' />}
          {flags.is_cgnat && <FlagBadge label='CGNAT' color='#f0883e' />}
          {flags.is_private && <FlagBadge label='Private Address' color='#8b949e' />}
          {!flags.is_proxy && !flags.is_hosting && !flags.is_mobile && !flags.is_cgnat && !flags.is_private && (
            <FlagBadge label='Residential / ISP' color='#3fb950' />
          )}
        </div>
      </InfoCard>

      <InfoCard title='Uniqueness Analysis'>
        {reasons.length === 0 ? (
          <div style={{ color: '#8b949e', fontSize: 13 }}>No specific signals detected.</div>
        ) : (
          <ul style={{ paddingLeft: 18 }}>
            {reasons.map((r, i) => (
              <li key={i} style={{ color: '#8b949e', fontSize: 13, marginBottom: 4 }}>{r}</li>
            ))}
          </ul>
        )}
      </InfoCard>

      {reputation && <ReputationPanel reputation={reputation} />}
    </div>
  )
}

function InfoCard({ title, children }) {
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 12, color: '#8b949e', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: '#8b949e' }}>{label}</span>
      <span style={{ color: '#e6edf3', fontFamily: 'monospace', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
