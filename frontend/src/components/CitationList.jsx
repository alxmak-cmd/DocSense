import { useState } from 'react'

function CitationCard({ citation }) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.round(citation.similarity_score * 100)

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '12px 14px',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
            {citation.document_name}
          </span>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {citation.section_header}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {citation.last_modified ? new Date(citation.last_modified).toLocaleDateString() : '—'}
        </span>
      </div>

      {/* Similarity bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1,
          height: 4,
          background: '#e2e8f0',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 70 ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, color: '#94a3b8', width: 32, textAlign: 'right' }}>
          {pct}%
        </span>
      </div>

      {/* Chunk preview */}
      <div>
        <p style={{
          fontSize: 12,
          color: '#475569',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          "{expanded ? citation.chunk_preview : citation.chunk_preview}"
        </p>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            marginTop: 4,
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: 11,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
    </div>
  )
}

export default function CitationList({ citations }) {
  if (!citations?.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h4 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Sources ({citations.length})
      </h4>
      {citations.map((c, i) => (
        <CitationCard key={i} citation={c} />
      ))}
    </div>
  )
}
