import { BrowserRouter } from 'react-router-dom'

import { AppRoutes } from './app-routes'
import { PhotoLibraryProvider } from './features/photos/photo-library-context'

function App() {
  return (
    <BrowserRouter>
      <PhotoLibraryProvider>
        <AppRoutes />
      </PhotoLibraryProvider>
    </BrowserRouter>
  )
}

export default App
