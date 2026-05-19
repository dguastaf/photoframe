import { useEffect, useState } from 'react'
import { SERVER_PORT } from '../../config/ports'
import './App.css'

function App() {
  const [status, setStatus] = useState('Checking API…')

  useEffect(() => {
    fetch('/health')
      .then((response) => response.json())
      .then((body: { ok?: boolean }) => {
        setStatus(body.ok ? 'API connected' : 'API unhealthy')
      })
      .catch(() => {
        setStatus(`API unreachable — start the server on port ${SERVER_PORT}`)
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
