import { useEffect, useState } from 'react'
import { SERVER_PORT } from '../../config/ports'
import { getHealth } from './features/health/health'
import { ApiError } from './lib/api-client'
import './App.css'

// TODO: extract health-status UI and fetch logic into a dedicated component
function App() {
  const [status, setStatus] = useState('Checking API…')

  useEffect(() => {
    getHealth()
      .then((body) => {
        setStatus(body.ok ? 'API connected' : 'API unhealthy')
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setStatus(err.detail)
        } else {
          setStatus(`API unreachable — start the server on port ${SERVER_PORT}`)
        }
      })
  }, [])

  return (
    <main className="app">
      <h1>Photoframe</h1>
      <p className="status">{status}</p>
    </main>
  )
}

export default App
