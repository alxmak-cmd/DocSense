import { useCallback, useEffect, useState } from 'react'
import QueryInput from './components/QueryInput'
import ResponseCard from './components/ResponseCard'
import UploadPanel from './components/UploadPanel'

// Stable session ID for the lifetime of this browser tab
const SESSION_ID = crypto.randomUUID()

export default function App() {
  const [documents, setDocuments] = useState([])
  const [indexStatus, setIndexStatus] = useState(null)
  const [response, setResponse] = useState(null)
  const [lastQuery, setLastQuery] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/index/status')
      if (res.ok) setIndexStatus(await res.json())
    } catch {
      // backend not yet reachable — silently ignore on mount
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleIngest = useCallback((doc) => {
    setDocuments(prev => [...prev, doc])
    fetchStatus()
  }, [fetchStatus])

  const handleQuery = useCallback(async (query) => {
    setLoading(true)
    setError(null)
    setLastQuery(query)
    try {
      const res = await fetch('/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: SESSION_ID }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Query failed')
      setResponse(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <header style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        background: '#0f172a',
        color: '#f1f5f9',
        flexShrink: 0,
        gap: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>DocSense</span>
        <span style={{ fontSize: 11, color: '#64748b', paddingTop: 1 }}>AI documentation agent</span>
      </header>

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel — upload (30%) */}
        <div style={{ width: '30%', flexShrink: 0, overflow: 'hidden' }}>
          <UploadPanel
            onIngest={handleIngest}
            documents={documents}
            indexStatus={indexStatus}
          />
        </div>

        {/* Right panel — Q&A (70%) */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 20,
          gap: 12,
          overflow: 'hidden',
        }}>
          <ResponseCard
            response={response}
            query={lastQuery}
            loading={loading}
            error={error}
          />
          <QueryInput
            onSubmit={handleQuery}
            loading={loading}
            hasDocuments={documents.length > 0}
          />
        </div>
      </div>
    </div>
  )
}
