import { useState } from 'react'
import { PRESET_QUESTIONS } from '../demoData'

export default function QueryInput({ onSubmit, loading, hasDocuments }) {
  const [query, setQuery] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const submit = () => {
    const trimmed = query.trim()
    if (!trimmed || loading || !hasDocuments) return
    onSubmit(trimmed)
    setQuery('')
  }

  return (
    <>
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '12px 0 0',
      borderTop: '1px solid #e2e8f0',
    }}>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading || !hasDocuments}
        placeholder={
          !hasDocuments
            ? 'Upload documentation first...'
            : 'Ask a question — Enter to submit, Shift+Enter for newline'
        }
        rows={2}
        style={{
          flex: 1,
          resize: 'none',
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          fontSize: 14,
          fontFamily: 'inherit',
          color: '#0f172a',
          background: loading || !hasDocuments ? '#f8fafc' : '#fff',
          outline: 'none',
          lineHeight: 1.5,
          transition: 'border-color 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = '#3b82f6' }}
        onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
      />
      <button
        onClick={submit}
        disabled={loading || !query.trim() || !hasDocuments}
        style={{
          padding: '0 20px',
          borderRadius: 8,
          border: 'none',
          background: loading || !query.trim() || !hasDocuments ? '#e2e8f0' : '#3b82f6',
          color: loading || !query.trim() || !hasDocuments ? '#94a3b8' : '#fff',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading || !query.trim() || !hasDocuments ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
          alignSelf: 'flex-end',
          height: 40,
        }}
      >
        {loading ? 'Thinking…' : 'Ask'}
      </button>
    </div>

    {/* Preset questions */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 2 }}>
      <span style={{ fontSize: 13, color: '#94a3b8', alignSelf: 'center', whiteSpace: 'nowrap' }}>Demo questions:</span>
      {PRESET_QUESTIONS.map(q => (
        <button
          key={q}
          onClick={() => setQuery(q)}
          disabled={loading}
          style={{
            fontSize: 13,
            padding: '4px 10px',
            borderRadius: 12,
            border: '1px solid #bae6fd',
            background: '#f0f9ff',
            color: '#0369a1',
            cursor: loading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.1s, border-color 0.1s',
          }}
          onMouseEnter={e => { if (!loading) { e.target.style.background = '#e0f2fe'; e.target.style.borderColor = '#7dd3fc' } }}
          onMouseLeave={e => { e.target.style.background = '#f0f9ff'; e.target.style.borderColor = '#bae6fd' }}
        >
          {q}
        </button>
      ))}
    </div>
    </>
  )
}
