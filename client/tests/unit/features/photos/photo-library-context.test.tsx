import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePhotoLibraryContext } from '@/features/photos/photo-library-context'

function ContextReader() {
  const library = usePhotoLibraryContext()
  return <span data-testid="status">{library.status}</span>
}

describe('usePhotoLibraryContext', () => {
  it('throws when used outside PhotoLibraryProvider', () => {
    expect(() => render(<ContextReader />)).toThrow(
      'usePhotoLibraryContext must be used within PhotoLibraryProvider',
    )
  })
})
