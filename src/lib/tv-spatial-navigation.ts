export type SpatialDirection = 'left' | 'right' | 'up' | 'down';

interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface RectProvider {
  getBoundingClientRect(): RectLike;
}

function center(rect: RectLike) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function isInDirection(
  current: ReturnType<typeof center>,
  candidate: ReturnType<typeof center>,
  direction: SpatialDirection
) {
  if (direction === 'left') return candidate.x < current.x - 4;
  if (direction === 'right') return candidate.x > current.x + 4;
  if (direction === 'up') return candidate.y < current.y - 4;
  return candidate.y > current.y + 4;
}

export function findNextSpatialTarget<T extends RectProvider>(
  currentElement: T,
  candidates: T[],
  direction: SpatialDirection
): T | null {
  const current = center(currentElement.getBoundingClientRect());
  const vertical = direction === 'up' || direction === 'down';
  let bestTarget: T | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidateElement of candidates) {
    const candidate = center(candidateElement.getBoundingClientRect());
    if (!isInDirection(current, candidate, direction)) continue;

    const primaryDistance = vertical
      ? Math.abs(candidate.y - current.y)
      : Math.abs(candidate.x - current.x);
    const crossDistance = vertical
      ? Math.abs(candidate.x - current.x)
      : Math.abs(candidate.y - current.y);
    const score = primaryDistance + crossDistance * 2;

    if (score < bestScore) {
      bestTarget = candidateElement;
      bestScore = score;
    }
  }

  return bestTarget;
}
