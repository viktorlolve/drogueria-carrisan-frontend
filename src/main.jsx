import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from "./components/ui/provider"
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './fonts.css'
import './tokens.css' 
import App from './App.jsx'

const CRASH_LOG_KEY = 'app_crash_log'

function logCrash(type, detail) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    message: detail?.message || String(detail),
    stack: detail?.stack || '',
    url: window.location.href,
  }
  try {
    const prev = JSON.parse(localStorage.getItem(CRASH_LOG_KEY) || '[]')
    prev.push(entry)
    if (prev.length > 10) prev.shift()
    localStorage.setItem(CRASH_LOG_KEY, JSON.stringify(prev))
  } catch { /* ignore */ }
}

window.addEventListener('error', (e) => {
  logCrash('error', e.error || e)
  const msg = e?.message || ''
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    window.location.reload()
  }
})
window.addEventListener('unhandledrejection', (e) => {
  logCrash('unhandledrejection', e.reason)
  const reason = String(e?.reason || '')
  if (reason.includes('dynamically imported module')) {
    e.preventDefault()
    window.location.reload()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Provider>
          <App />
        </Provider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)