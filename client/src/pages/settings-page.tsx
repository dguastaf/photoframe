import { Link } from 'react-router-dom'

import './settings-page.css'

export function SettingsPage() {
  return (
    <main className="settings-page">
      <h1 className="settings-page__title">Settings</h1>
      <p className="settings-page__placeholder">
        Display duration, sync, and other options will appear here.
      </p>
      <Link to="/" className="settings-page__back">
        Back to slideshow
      </Link>
    </main>
  )
}
