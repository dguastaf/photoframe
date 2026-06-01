import { Route, Routes } from 'react-router-dom'

import { SettingsPage } from './pages/settings-page'
import { SlideshowPage } from './pages/slideshow-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SlideshowPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}
