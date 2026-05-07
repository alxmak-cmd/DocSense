import ReactMarkdown from 'react-markdown'
import CitationList from './CitationList'
import ConfidenceBadge from './ConfidenceBadge'

function SkeletonLine({ width = '100%', height = 14 }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: 4,
      background: 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <SkeletonLine width="60%" height={18} />
      <SkeletonLine />
      <SkeletonLine />
      <SkeletonLine width="75%" />
    </div>
  )
}

function TypeBadge({ type }) {
  const isAnswered = type === 'answered'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      background: isAnswered ? '#dcfce7' : '#f1f5f9',
      color: isAnswered ? '#15803d' : '#475569',
      border: `1px solid ${isAnswered ? '#86efac' : '#cbd5e1'}`,
    }}>
      {isAnswered ? 'Answered' : 'Not Found'}
    </span>
  )
}

export default function ResponseCard({ response, query, loading, error }) {
  const cardStyle = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 24,
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  }

  if (loading) {
    return <div style={cardStyle}><LoadingSkeleton /></div>
  }

  if (error) {
    return (
      <div style={{ ...cardStyle, borderColor: '#fca5a5', background: '#fef2f2' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Error</span>
        <p style={{ fontSize: 13, color: '#7f1d1d' }}>{error}</p>
        <p style={{ fontSize: 12, color: '#94a3b8' }}>Check that the backend is running at 127.0.0.1:8000.</p>
      </div>
    )
  }

  if (!response) {
    return (
      <div style={{
        ...cardStyle,
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        border: '1px dashed #cbd5e1',
      }}>
        <p style={{ fontSize: 14 }}>Ask a question about your documentation</p>
      </div>
    )
  }

  if (response.response_type === 'not_found') {
    return (
      <div style={{ ...cardStyle, borderColor: '#cbd5e1', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TypeBadge type="not_found" />
        </div>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
          Not found in your indexed documentation. Check documentation coverage or ask a teammate.
        </p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <TypeBadge type="answered" />
        <ConfidenceBadge confidence={response.confidence} />
        {response.conflict && (
          <span title="Sources contain conflicting values — review citations" style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fcd34d',
          }}>
            Conflict detected
          </span>
        )}
      </div>

      {/* Question */}
      {query && (
        <div style={{
          fontSize: 13,
          color: '#64748b',
          borderLeft: '3px solid #e2e8f0',
          paddingLeft: 12,
        }}>
          {query}
        </div>
      )}

      {/* Answer */}
      <div style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: '#1e293b',
      }}>
        <ReactMarkdown>{response.answer}</ReactMarkdown>
      </div>

      {/* Citations */}
      {response.citations?.length > 0 && (
        <CitationList citations={response.citations} />
      )}
    </div>
  )
}
