import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  swipeDistanceForViewport,
  useManualNavigation,
} from '@/features/photos/hooks/useManualNavigation'

function NavSurface({
  enabled,
  onNext,
  onPrev,
}: {
  enabled: boolean
  onNext: () => void
  onPrev: () => void
}) {
  const bindings = useManualNavigation({ onNext, onPrev, enabled })
  return (
    <div data-testid="surface" {...bindings}>
      slide
    </div>
  )
}

function swipeHorizontal(
  el: HTMLElement,
  fromX: number,
  toX: number,
  y = 100,
) {
  const steps = 10
  fireEvent.pointerDown(el, {
    clientX: fromX,
    clientY: y,
    pointerId: 1,
    button: 0,
    buttons: 1,
    pointerType: 'mouse',
  })
  for (let i = 1; i <= steps; i++) {
    const x = fromX + ((toX - fromX) * i) / steps
    fireEvent.pointerMove(el, {
      clientX: x,
      clientY: y,
      pointerId: 1,
      buttons: 1,
      pointerType: 'mouse',
    })
  }
  fireEvent.pointerUp(el, {
    clientX: toX,
    clientY: y,
    pointerId: 1,
    button: 0,
    pointerType: 'mouse',
  })
}

describe('useManualNavigation', () => {
  it('calls onNext on swipe left past threshold', () => {
    const distance = swipeDistanceForViewport()
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled onNext={onNext} onPrev={onPrev} />)
    const surface = screen.getByTestId('surface')

    swipeHorizontal(surface, 200, 200 - distance - 1)

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('calls onPrev on swipe right past threshold', () => {
    const distance = swipeDistanceForViewport()
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled onNext={onNext} onPrev={onPrev} />)
    const surface = screen.getByTestId('surface')

    swipeHorizontal(surface, 100, 100 + distance + 1)

    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onNext).not.toHaveBeenCalled()
  })

  it('ignores movement below threshold', () => {
    const distance = swipeDistanceForViewport()
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled onNext={onNext} onPrev={onPrev} />)
    const surface = screen.getByTestId('surface')

    swipeHorizontal(surface, 100, 100 + distance - 1)

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('ignores mostly vertical movement', () => {
    const distance = swipeDistanceForViewport()
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled onNext={onNext} onPrev={onPrev} />)
    const surface = screen.getByTestId('surface')

    fireEvent.pointerDown(surface, {
      clientX: 100,
      clientY: 100,
      pointerId: 1,
      button: 0,
      buttons: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerMove(surface, {
      clientX: 100 + distance + 20,
      clientY: 100 + distance + 20,
      pointerId: 1,
      buttons: 1,
      pointerType: 'mouse',
    })
    fireEvent.pointerUp(surface, {
      clientX: 100 + distance + 20,
      clientY: 100 + distance + 20,
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
    })

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('does not navigate when disabled', () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled={false} onNext={onNext} onPrev={onPrev} />)
    const surface = screen.getByTestId('surface')

    swipeHorizontal(surface, 200, 50)

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrev).not.toHaveBeenCalled()
  })

  it('navigates with arrow keys when enabled', () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled onNext={onNext} onPrev={onPrev} />)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('ignores arrow keys when disabled', () => {
    const onNext = vi.fn()
    const onPrev = vi.fn()
    render(<NavSurface enabled={false} onNext={onNext} onPrev={onPrev} />)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(onNext).not.toHaveBeenCalled()
    expect(onPrev).not.toHaveBeenCalled()
  })
})
