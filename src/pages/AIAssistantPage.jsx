import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plane, Send, Sparkles } from 'lucide-react'
import { getCurrentUser } from '../services/auth'
import './AIAssistantPage.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const savedQuestions = [
  'How do I search flights?',
  
  'How does Razorpay payment work?',
  'How can I cancel my booking?',
  'How do I view or print my ticket?',
  'How long does a refund take?',
  'Which airports and cities are available?',
  'Can I filter flights by price?',
  'How many travellers can I add?',
  'What payment methods are supported?',
  'How is my information protected?',
  'How do I contact support?',
]

const closingMessage = /\b(no thanks|no thank you|nothing else|that(?:'|’)s all|thats all|i(?:'|’)m done|im done|goodbye|bye|stop)\b/i

async function askAssistant(message, conversation) {
  const isSearch = /\b(from\s+.+\s+to\s+|tomorrow|today|\d{4}-\d{2}-\d{2}|\bfor\s+\d+\s+(?:travellers|passengers)|under\s+[₹$]?\s*\d)\b/i.test(message)
  const endpoint = isSearch ? 'assistant' : 'chat'
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken')
  const response = await fetch(`${API_BASE_URL}/supportService/api/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-access-token': token },
    body: JSON.stringify({
      message,
      history: conversation
        .filter((item) => item.from === 'user' || item.from === 'assistant')
        .slice(-8)
        .map((item) => ({ role: item.from === 'user' ? 'user' : 'assistant', text: item.text || item.message || '' }))
        .filter((item) => item.text),
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = result.error?.explanation || result.error?.message || result.message
    throw new Error(Array.isArray(detail) ? detail.join(' ') : detail || 'The assistant is unavailable. Please try again.')
  }
  return endpoint === 'chat'
    ? { type: 'message', message: result.answer, notice: result.notice, suggestions: result.suggestions }
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
  const [ended, setEnded] = useState(false)

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
    if (!question || loading || ended) return
    setDraft('')
    const conversation = messages
    setMessages((current) => [...current, { from: 'user', text: question }])
    if (closingMessage.test(question)) {
      setMessages((current) => [...current, { from: 'assistant', message: 'You’re welcome. I’ll stop here. Start a new chat whenever you need help again.' }])
      setEnded(true)
      return
    }
    setLoading(true)
    try {
      const response = await askAssistant(question, conversation)
      setMessages((current) => [...current, { from: 'assistant', ...response }])
      if (response.ended || response.type === 'conversation_end') setEnded(true)
    } catch (error) {
      setMessages((current) => [...current, { from: 'assistant', message: error.message, error: true }])
    } finally {
      setLoading(false)
    }
  }

  const clearConversation = () => {
    if (!loading) {
      setMessages([])
      setEnded(false)
    }
  }

  const endConversation = () => {
    if (loading || ended) return
    setMessages((current) => [...current, { from: 'user', text: 'OK, thanks' }, { from: 'assistant', message: 'You’re welcome. I’ll stop here. Start a new chat whenever you need help again.' }])
    setEnded(true)
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
        <div className="ai-panel-header"><span><Sparkles size={17} /></span><div><strong>SkyLink assistant</strong><small>{ended ? 'Conversation ended' : 'AI help for your journey'}</small></div><button type="button" onClick={clearConversation} disabled={loading}>New chat</button></div>
        <div className="ai-messages" aria-live="polite">
          <article className="ai-message assistant">Hi! Choose a saved question or type a request below. I cannot access or change your account.</article>
          {messages.map((item, index) => <article className={`ai-message ${item.from}${item.error ? ' error' : ''}`} key={`${item.from}-${index}`}>
            <span>{item.message || item.text}</span>
            {item.notice && <small className="ai-fallback-notice">{item.notice}</small>}
            {item.from === 'assistant' && item.suggestions?.length > 0 && !ended && <div className="ai-follow-up-options">{item.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => send(suggestion)} disabled={loading}>{suggestion}</button>)}</div>}
            {item.from === 'assistant' && !item.error && !ended && <button type="button" className="ai-done-option" onClick={endConversation} disabled={loading}>OK, thanks</button>}
            {item.type === 'flight_results' && <div className="ai-results">{item.results?.map((flight) => <div className="ai-result" key={flight.id}>
              <div><strong>{flight.flightNumber || `Flight ${flight.id}`}</strong><small>{flight.departureAirport?.code || flight.departureAirportId} → {flight.arrivalAirport?.code || flight.arrivalAirportId}</small></div>
              <div><span>{formatTime(flight.departureTime)} – {formatTime(flight.arrivalTime)}</span><small>₹{Number(flight.price || 0).toLocaleString('en-IN')}</small></div>
              <button type="button" onClick={() => navigate(`/booking/${flight.id}?date=${encodeURIComponent(item.search.date)}&travellers=${encodeURIComponent(item.search.travellers)}`)}>Continue booking</button>
            </div>)}</div>}
          </article>)}
          {loading && <article className="ai-message assistant">Thinking…</article>}
          {messages.length === 0 && <div className="ai-saved-questions">{savedQuestions.map((question) => <button key={question} type="button" onClick={() => send(question)}>{question}</button>)}</div>}
          {ended && <button type="button" className="ai-restart-button" onClick={clearConversation}>Start a new chat</button>}
        </div>
        <form className="ai-form" onSubmit={(event) => { event.preventDefault(); send(draft) }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} disabled={ended} placeholder={ended ? 'Conversation ended — start a new chat' : 'Type your query…'} aria-label="Type your assistant query" />
          <button type="submit" disabled={!draft.trim() || loading || ended} aria-label="Send query"><Send size={17} /></button>
        </form>
        <small className="ai-note">AI-generated · Messages are sent to Gemini · Customer access only</small>
      </section>
    </section>
  </main>
}
