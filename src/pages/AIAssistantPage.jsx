import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plane, Send, Sparkles } from 'lucide-react'
import { getCurrentUser } from '../services/auth'
import './AIAssistantPage.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const savedQuestions = [
  'How do I search flights?',
  'Find a flight from Delhi to Mumbai tomorrow for two travellers',
  'How does Razorpay payment work?',
  'How can I cancel my booking?',
]

async function askAssistant(message) {
  const isSearch = /\b(flight|fly|travel|book|airport|depart|destination|route|tomorrow|today)\b/i.test(message)
  const endpoint = isSearch ? 'assistant' : 'chat'
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
  const response = await fetch(`${API_BASE_URL}/supportService/api/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-access-token': token },
    body: JSON.stringify({ message }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'The assistant is unavailable. Please try again.')
  return endpoint === 'chat'
    ? { type: 'message', message: result.answer }
    : result
}

function formatTime(value) {
  return value ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—'
}

export default function AIAssistantPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [accessChecked, setAccessChecked] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
    if (!token) {
      navigate('/login', { replace: true, state: { from: '/assistant' } })
      return
    }
    getCurrentUser(token).then((user) => {
      if (!user.roles?.includes('customer') || user.roles.includes('admin')) navigate('/', { replace: true })
      else setAccessChecked(true)
    }).catch(() => navigate('/login', { replace: true, state: { from: '/assistant' } }))
  }, [navigate])

  const send = async (value) => {
    const question = value.trim()
    if (!question || loading) return
    setDraft('')
    setMessages((current) => [...current, { from: 'user', text: question }])
    setLoading(true)
    try {
      const response = await askAssistant(question)
      setMessages((current) => [...current, { from: 'assistant', ...response }])
    } catch (error) {
      setMessages((current) => [...current, { from: 'assistant', message: error.message, error: true }])
    } finally {
      setLoading(false)
    }
  }

  if (!accessChecked) return null

  return <main className="ai-page">
    <header className="ai-page-header">
      <Link to="/" className="ai-brand"><span><Plane size={17} /></span>Sky<span>Link</span></Link>
      <Link to="/" className="ai-back"><ArrowLeft size={15} /> Back home</Link>
    </header>
    <section className="ai-layout">
      <div className="ai-intro">
        <p className="ai-kicker"><Sparkles size={14} /> CUSTOMER ASSISTANCE</p>
        <h1>Your personal flight assistant.</h1>
        <p>Ask in plain language. I can explain SkyLink features and find real flights, then take you to the normal secure booking process.</p>
        <div className="ai-format-card">
          <strong>Accepted search format</strong>
          <code>Find a flight from [city] to [city] [date] for [number] travellers</code>
          <small>Examples: “tomorrow”, “today”, or “2026-11-15”. You may also add “under ₹8000”.</small>
        </div>
      </div>
      <section className="ai-panel" aria-label="SkyLink AI assistant">
        <div className="ai-panel-header"><span><Sparkles size={17} /></span><div><strong>SkyLink assistant</strong><small>AI help for your journey</small></div></div>
        <div className="ai-messages" aria-live="polite">
          <article className="ai-message assistant">Hi! Choose a saved question or type a request below. I cannot access or change your account.</article>
          {messages.map((item, index) => <article className={`ai-message ${item.from}${item.error ? ' error' : ''}`} key={`${item.from}-${index}`}>
            <span>{item.message || item.text}</span>
            {item.type === 'flight_results' && <div className="ai-results">{item.results?.map((flight) => <div className="ai-result" key={flight.id}>
              <div><strong>{flight.flightNumber || `Flight ${flight.id}`}</strong><small>{flight.departureAirport?.code || flight.departureAirportId} → {flight.arrivalAirport?.code || flight.arrivalAirportId}</small></div>
              <div><span>{formatTime(flight.departureTime)} – {formatTime(flight.arrivalTime)}</span><small>₹{Number(flight.price || 0).toLocaleString('en-IN')}</small></div>
              <button type="button" onClick={() => navigate(`/booking/${flight.id}?date=${encodeURIComponent(item.search.date)}&travellers=${encodeURIComponent(item.search.travellers)}`)}>Continue booking</button>
            </div>)}</div>}
          </article>)}
          {loading && <article className="ai-message assistant">Thinking…</article>}
          {messages.length === 0 && <div className="ai-saved-questions">{savedQuestions.map((question) => <button key={question} type="button" onClick={() => send(question)}>{question}</button>)}</div>}
        </div>
        <form className="ai-form" onSubmit={(event) => { event.preventDefault(); send(draft) }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} placeholder="Type your query…" aria-label="Type your assistant query" />
          <button type="submit" disabled={!draft.trim() || loading} aria-label="Send query"><Send size={17} /></button>
        </form>
        <small className="ai-note">AI-generated · Messages are sent to Gemini · Customer access only</small>
      </section>
    </section>
  </main>
}
