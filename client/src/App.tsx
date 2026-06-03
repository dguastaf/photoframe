import { BrowserRouter } from 'react-router-dom'

import { AppRoutes } from './app-routes'
import { PhotoLibraryProvider } from './features/photos/photo-library-context'
import { SettingsDurationProvider } from './features/settings/settings-duration-context'

function App() {
  return (
    <BrowserRouter>
      <PhotoLibraryProvider>
        <SettingsDurationProvider>
          <AppRoutes />
        </SettingsDurationProvider>
      </PhotoLibraryProvider>
    </BrowserRouter>
  )
}

export default App
