import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { photoImageUrl } from '@/features/photos/api/photos'
import { usePrefetchImage } from '@/features/photos/hooks/usePrefetchImage'

describe('usePrefetchImage', () => {
  let images: Array<{ src: string }>

  beforeEach(() => {
    images = []
    vi.stubGlobal(
      'Image',
      class MockImage {
        #src = ''

        constructor() {
          images.push(this)
        }

        get src() {
          return this.#src
        }

        set src(value: string) {
          this.#src = value
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does nothing when photoId is undefined', () => {
    renderHook(() => usePrefetchImage(undefined))
    expect(images).toHaveLength(0)
  })

  it('sets src via photoImageUrl when photoId is defined', () => {
    renderHook(() => usePrefetchImage('prefetch-photo-abc'))
    expect(images).toHaveLength(1)
    expect(images[0]?.src).toContain(photoImageUrl('prefetch-photo-abc'))
  })

  it('does not abort prefetch on id change or unmount', () => {
    const { rerender, unmount } = renderHook(
      ({ id }: { id: string | undefined }) => usePrefetchImage(id),
      { initialProps: { id: 'prefetch-photo-a' as string | undefined } },
    )
    const first = images[0]
    expect(first?.src).toContain('prefetch-photo-a')

    rerender({ id: 'prefetch-photo-b' })
    expect(first?.src).toContain('prefetch-photo-a')
    expect(images[1]?.src).toContain('prefetch-photo-b')

    unmount()
    expect(first?.src).toContain('prefetch-photo-a')
    expect(images[1]?.src).toContain('prefetch-photo-b')
  })
})
