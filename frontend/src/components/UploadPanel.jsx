import { useRef, useState } from 'react'
import { DEMO_DOCS } from '../demoData'

// TODO: move to env var before any production use — currently hardcoded for Vercel/Render portfolio deployment
const API_BASE = 'https://docsense-backend-us3p.onrender.com'
const ACCEPTED = ['.md', '.txt', '.pdf']

function waitWithCountdown(prefix, seconds, onTick) {
  return new Promise(resolve => {
    let remaining = seconds
    onTick(`${prefix} retrying in ${remaining}s`)
    const interval = setInterval(() => {
      remaining--
      if (remaining <= 0) {
        clearInterval(interval)
        resolve()
      } else {
        onTick(`${prefix} retrying in ${remaining}s`)
      }
    }, 1000)
  })
}

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
        <span style={{ fontSize: 14, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </span>
        <span style={{ fontSize: 12, color: '#64748b' }}>
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
  const [retryMessage, setRetryMessage] = useState(null)
  const inputRef = useRef(null)

  const encodeContent = (str) => {
    const bytes = new TextEncoder().encode(str)
    let binary = ''
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    return btoa(binary)
  }

  const handleLoadDemo = async () => {
    setLoadingDemo(true)
    setDemoError(null)
    const failures = []
    let coldStartRetries = 0

    const retryPrefixes = [
      'Backend is waking up...',
      'Still starting up...',
    ]

    for (let i = 0; i < DEMO_DOCS.length; i++) {
      const doc = DEMO_DOCS[i]

      const attemptIngest = async () => {
        const content_base64 = encodeContent(doc.content)
        const res = await fetch(`${API_BASE}/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: doc.filename, content_base64 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.detail || data.error || 'Ingest failed')
        return data
      }

      let success = false
      let lastErr = null
      for (let attempt = 0; attempt <= 2 && !success; attempt++) {
        try {
          const data = await attemptIngest()
          onIngest({ name: data.document_name, chunks: data.chunks_indexed })
          success = true
        } catch (err) {
          lastErr = err
          if (attempt < 2 && err instanceof TypeError && coldStartRetries < 2) {
            coldStartRetries++
            await waitWithCountdown(retryPrefixes[coldStartRetries - 1], 45, setRetryMessage)
            setRetryMessage(null)
          } else {
            break
          }
        }
      }
      if (!success && lastErr) {
        console.error(`Demo ingest failed [${doc.filename}]:`, lastErr.message)
        failures.push(`${doc.filename}: ${lastErr.message}`)
      }

      if (i < DEMO_DOCS.length - 1) await new Promise(r => setTimeout(r, 500))
    }

    setLoadingDemo(false)
    setRetryMessage(null)
    if (failures.length > 0) setDemoError(`Failed to load — ${failures.join(' | ')}`)
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

    const attemptIngest = async () => {
      const content_base64 = await toBase64(file)
      const res = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Ingest failed')
      return data
    }

    const retryPrefixes = [
      'Backend is waking up...',
      'Still starting up...',
    ]

    try {
      let lastErr = null
      for (let attempt = 0; attempt <= 2; attempt++) {
        try {
          const data = await attemptIngest()
          onIngest({ name: data.document_name, chunks: data.chunks_indexed })
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          if (attempt < 2 && err instanceof TypeError) {
            await waitWithCountdown(retryPrefixes[attempt], 45, setRetryMessage)
            setRetryMessage(null)
          } else {
            break
          }
        }
      }
      if (lastErr) setError(lastErr.message)
    } finally {
      setUploading(false)
      setRetryMessage(null)
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

      {/* App description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.6 }}>
          DocSense is an AI-powered RAG (Retrieval-Augmented Generation) documentation agent that answers questions grounded in your docs — and flags when sources contradict each other.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>How to use:</p>
          {[
            'Upload your documentation files (MD, TXT, or PDF)',
            'Ask a question about your docs',
            'DocSense retrieves relevant passages, generates a grounded answer with source citations and confidence score — and surfaces conflicts when sources disagree',
          ].map((step, i) => (
            <p key={i} style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>
              {i + 1}. {step}
            </p>
          ))}
        </div>
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

      {/* Demo mode separator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, borderTop: '1px solid #e2e8f0' }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>New here?</span>
        <div style={{ flex: 1, borderTop: '1px solid #e2e8f0' }} />
      </div>

      {/* Demo mode */}
      <div style={{
        border: '1px solid #bae6fd',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Demo Mode</p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
            Load 3 pre-built docs, then use the preset questions to see DocSense retrieve grounded answers with source citations.
          </p>
        </div>
        <button
          onClick={handleLoadDemo}
          disabled={loadingDemo || demoLoaded}
          style={{
            padding: '7px 0',
            borderRadius: 6,
            border: `1px solid ${demoLoaded ? '#86efac' : '#bae6fd'}`,
            background: demoLoaded ? '#f0fdf4' : '#f0f9ff',
            color: demoLoaded ? '#15803d' : loadingDemo ? '#94a3b8' : '#0369a1',
            fontWeight: 600,
            fontSize: 13,
            cursor: loadingDemo || demoLoaded ? 'default' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {demoLoaded ? 'Demo Docs Loaded' : loadingDemo ? 'Loading demo docs…' : 'Load Demo Docs'}
        </button>
        <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          Note: Due to free tier API limits, please wait 30 seconds between uploads if loading your own docs.
        </p>
        {demoError && (
          <p style={{ fontSize: 11, color: '#dc2626', lineHeight: 1.4 }}>{demoError}</p>
        )}
      </div>

      {/* Cold start notice */}
      <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
        Note: This app runs on a free-tier backend that sleeps after inactivity. First request may take up to 30 seconds to wake up — this is expected behavior for a portfolio deployment.
      </p>

      {/* Retry banner */}
      {retryMessage && (
        <p style={{ fontSize: 12, color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 10px' }}>
          {retryMessage}
        </p>
      )}

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
