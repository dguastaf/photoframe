/** Fisher–Yates shuffle; returns a new array without mutating the input. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = result[i]!
    result[i] = result[j]!
    result[j] = tmp
  }
  return result
}
