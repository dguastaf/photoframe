import { afterEach, describe, expect, it, vi } from 'vitest'
import { shuffle } from '@/features/photos/lib/shuffle'

describe('shuffle', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a permutation of the same length', () => {
    const input = ['a', 'b', 'c', 'd', 'e']
    const result = shuffle(input)
    expect(result).toHaveLength(input.length)
    expect(result.sort()).toEqual([...input].sort())
    expect(input).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    shuffle(input)
    expect(input).toEqual([1, 2, 3])
  })

  it('is deterministic when Math.random is fixed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const first = shuffle(['x', 'y', 'z'])
    const second = shuffle(['x', 'y', 'z'])
    expect(first).toEqual(second)
    expect([...first].sort()).toEqual(['x', 'y', 'z'])
  })
})
