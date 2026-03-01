export default function ScoreGauge({ score, label }) {
  const color = score >= 70 ? '#f0883e'
    : score >= 40 ? '#d29922'
    : '#3fb950'

  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>{label?.toUpperCase()}</div>
      <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto' }}>
        <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={45} cy={45} r={r} fill='none' stroke='#21262d' strokeWidth={8} />
          <circle
            cx={45} cy={45} r={r}
            fill='none'
            stroke={color}
            strokeWidth={8}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap='round'
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 22, fontWeight: 700, color,
        }}>
          {score}
        </div>
      </div>
    </div>
  )
}
