import { useRef, useState } from 'react'
import { DEMO_DOCS } from '../demoData'

// TODO: move to env var before any production use — currently hardcoded for Vercel/Render portfolio deployment
const API_BASE = 'https://docsense-backend-us3p.onrender.com'
const ACCEPTED = ['.md', '.txt', '.pdf']

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function DocumentRow({ doc }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 10px',
      background: '#f8fafc',
      borderRadius: 6,
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          {doc.chunks} chunks
        </span>
      </div>
      <span style={{
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 4,
        background: '#dcfce7',
        color: '#15803d',
        fontWeight: 600,
        flexShrink: 0,
        marginLeft: 8,
      }}>
        Indexed
      </span>
    </div>
  )
}

export default function UploadPanel({ onIngest, documents, indexStatus }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [demoLoaded, setDemoLoaded] = useState(false)
  const [demoError, setDemoError] = useState(null)
  const inputRef = useRef(null)

  const handleLoadDemo = async () => {
    setLoadingDemo(true)
    setDemoError(null)
    const failures = []
    for (const doc of DEMO_DOCS) {
      try {
        const content_base64 = btoa(unescape(encodeURIComponent(doc.content)))
        const res = await fetch(`${API_BASE}/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: doc.filename, content_base64 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || data.error || 'Ingest failed')
        onIngest({ name: data.document_name, chunks: data.chunks_indexed })
      } catch (err) {
        console.error(`Demo ingest failed [${doc.filename}]:`, err.message)
        failures.push(doc.filename)
      }
    }
    setLoadingDemo(false)
    if (failures.length > 0) setDemoError(`Failed to load: ${failures.join(', ')}`)
    else setDemoLoaded(true)
  }

  const handleFile = async (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!ACCEPTED.includes(ext)) {
      setError(`Unsupported file type "${ext}". Accepted: ${ACCEPTED.join(', ')}`)
      return
    }

    setUploading(true)
    setError(null)

    try {
      const content_base64 = await toBase64(file)
      const res = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Ingest failed')
      onIngest({ name: data.document_name, chunks: data.chunks_indexed })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e) => {
    const file = e.target.files[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      padding: '20px 16px',
      borderRight: '1px solid #e2e8f0',
      background: '#fff',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Documentation</h2>
        {indexStatus && (
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {indexStatus.document_count} doc{indexStatus.document_count !== 1 ? 's' : ''} · {indexStatus.chunk_count} chunks
          </p>
        )}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : '#cbd5e1'}`,
          borderRadius: 10,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragging ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.15s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          onChange={onInputChange}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <p style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
          {uploading ? 'Uploading…' : 'Drop a file or click to browse'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {ACCEPTED.map(ext => (
            <span key={ext} style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 4,
              background: '#e2e8f0',
              color: '#475569',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              {ext.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Demo mode */}
      <div style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Demo Mode</p>
          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            Load 6 pre-built docs with deliberate conflicts, then use the preset questions to see DocSense detect contradictions across sources.
          </p>
        </div>
        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo || demoLoaded}
          style={{
            padding: '6px 0',
            borderRadius: 6,
            border: `1px solid ${demoLoaded ? '#86efac' : '#e2e8f0'}`,
            background: demoLoaded ? '#f0fdf4' : '#f8fafc',
            color: demoLoaded ? '#15803d' : loadingDemo ? '#94a3b8' : '#475569',
            fontWeight: 600,
            fontSize: 12,
            cursor: loadingDemo || demoLoaded ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {demoLoaded ? 'Demo Docs Loaded' : loadingDemo ? 'Loading demo docs…' : 'Load Demo Docs'}
        </button>
        {demoError && (
          <p style={{ fontSize: 11, color: '#dc2626' }}>{demoError}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p style={{ fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 10px' }}>
          {error}
        </p>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h4 style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Indexed
          </h4>
          {documents.map((doc, i) => (
            <DocumentRow key={i} doc={doc} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {documents.length === 0 && !uploading && (
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
          Upload documentation to get started
        </p>
      )}
    </div>
  )
}
