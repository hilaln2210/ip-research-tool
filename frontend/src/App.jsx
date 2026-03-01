import { useState } from 'react'
import IPAnalyzer from './components/IPAnalyzer'
import BulkAnalyzer from './components/BulkAnalyzer'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('single')

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'monospace' }}>
      <header style={{ borderBottom: '1px solid #1e293b', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#38bdf8' }}>IP Research</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Classify · Score · Attribute</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {['single', 'bulk'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                background: tab === t ? '#38bdf8' : '#1e293b',
                color: tab === t ? '#0f1117' : '#94a3b8',
                fontWeight: tab === t ? 700 : 400,
              }}
            >
              {t === 'single' ? 'Single IP' : 'Bulk Scan'}
            </button>
          ))}
        </div>
      </header>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {tab === 'single' ? <IPAnalyzer /> : <BulkAnalyzer />}
      </main>
    </div>
  )
}
