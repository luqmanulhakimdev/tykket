/**
 * Calculates a new fractional index position for issue ordering within a column or list.
 *
 * Scenarios:
 * 1. Empty column default: No prev and no next -> 1000.0
 * 2. Top-of-column insertion: No prev, but has next -> nextPos / 2
 * 3. Bottom-of-column insertion: Has prev, but no next -> prevPos + 1000.0
 * 4. Between two cards: Has both prev and next -> (prevPos + nextPos) / 2
 */
export function calculateNewPosition(prevPos?: number, nextPos?: number): number {
  const hasPrev = typeof prevPos === 'number' && !isNaN(prevPos);
  const hasNext = typeof nextPos === 'number' && !isNaN(nextPos);

  if (!hasPrev && !hasNext) {
    return 1000.0;
  }

  if (!hasPrev && hasNext) {
    return (nextPos as number) / 2;
  }

  if (hasPrev && !hasNext) {
    return (prevPos as number) + 1000.0;
  }

  // Both exist: between two positions
  return ((prevPos as number) + (nextPos as number)) / 2;
}

