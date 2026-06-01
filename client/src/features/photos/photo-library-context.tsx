import { createContext, useContext, type ReactNode } from 'react'

import { usePhotoLibrary } from './hooks/usePhotoLibrary'

type PhotoLibraryContextValue = ReturnType<typeof usePhotoLibrary>

const PhotoLibraryContext = createContext<PhotoLibraryContextValue | null>(null)

export function PhotoLibraryProvider({ children }: { children: ReactNode }) {
  const value = usePhotoLibrary()
  return (
    <PhotoLibraryContext.Provider value={value}>
      {children}
    </PhotoLibraryContext.Provider>
  )
}

export function usePhotoLibraryContext() {
  const context = useContext(PhotoLibraryContext)
  if (context === null) {
    throw new Error(
      'usePhotoLibraryContext must be used within PhotoLibraryProvider',
    )
  }
  return context
}
