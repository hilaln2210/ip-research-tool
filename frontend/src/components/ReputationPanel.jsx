export default function ReputationPanel({ reputation }) {
  const { threat_score, threat_reasons, sources } = reputation
  const { abuseipdb, shodan, virustotal } = sources || {}

  const color = threat_score >= 70 ? '#f85149'
    : threat_score >= 30 ? '#d29922'
    : '#3fb950'

  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 12, color: '#8b949e', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Threat Intelligence
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{
          fontSize: 28, fontWeight: 700, color,
          minWidth: 60, textAlign: 'center',
        }}>
          {threat_score}
          <span style={{ fontSize: 12, color: '#8b949e' }}>/100</span>
        </div>
        <div>
          <div style={{ fontSize: 13, color, fontWeight: 600 }}>
            {threat_score >= 70 ? 'High Threat' : threat_score >= 30 ? 'Moderate Threat' : 'Low / Clean'}
          </div>
          {threat_reasons.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{r}</div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <SourceCard title='AbuseIPDB' data={abuseipdb} renderFn={renderAbuse} />
        <SourceCard title='Shodan' data={shodan} renderFn={renderShodan} />
        <SourceCard title='VirusTotal' data={virustotal} renderFn={renderVT} />
      </div>
    </div>
  )
}

function SourceCard({ title, data, renderFn }) {
  return (
    <div style={{
      background: '#0d1117', border: '1px solid #21262d',
      borderRadius: 6, padding: '12px 14px',
    }}>
      <div style={{ fontSize: 12, color: '#58a6ff', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {!data?.available ? (
        <div style={{ fontSize: 11, color: '#484f58' }}>
          {data?.reason || 'Not configured'}
        </div>
      ) : renderFn(data)}
    </div>
  )
}

function renderAbuse(d) {
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: '#8b949e' }}>Score: </span>
        <span style={{ color: d.abuse_confidence_score > 50 ? '#f85149' : '#3fb950', fontWeight: 700 }}>
          {d.abuse_confidence_score}%
        </span>
      </div>
      <div style={{ color: '#8b949e' }}>Reports: {d.total_reports}</div>
      <div style={{ color: '#8b949e' }}>Users: {d.distinct_users}</div>
      {d.categories?.length > 0 && (
        <div style={{ marginTop: 6, color: '#d29922', fontSize: 11 }}>{d.categories.join(', ')}</div>
      )}
    </div>
  )
}

function renderShodan(d) {
  if (!d.found) return <div style={{ fontSize: 11, color: '#8b949e' }}>Not indexed</div>
  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ color: '#8b949e' }}>Ports: {d.open_ports?.join(', ') || 'none'}</div>
      {d.vulns?.length > 0 && (
        <div style={{ color: '#f85149', marginTop: 4 }}>CVEs: {d.vulns.length}</div>
      )}
      {d.tags?.length > 0 && (
        <div style={{ color: '#8b949e', marginTop: 4, fontSize: 11 }}>{d.tags.join(', ')}</div>
      )}
    </div>
  )
}

function renderVT(d) {
  if (!d.found) return <div style={{ fontSize: 11, color: '#8b949e' }}>Not found</div>
  return (
    <div style={{ fontSize: 12 }}>
      <div>
        <span style={{ color: '#8b949e' }}>Malicious: </span>
        <span style={{ color: d.malicious_votes > 0 ? '#f85149' : '#3fb950', fontWeight: 700 }}>
          {d.malicious_votes}
        </span>
      </div>
      <div style={{ color: '#8b949e' }}>Suspicious: {d.suspicious_votes}</div>
      <div style={{ color: '#8b949e' }}>Harmless: {d.harmless_votes}</div>
      <div style={{ color: '#8b949e' }}>Reputation: {d.reputation}</div>
    </div>
  )
}
