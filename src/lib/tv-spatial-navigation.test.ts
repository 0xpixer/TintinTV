import { findNextSpatialTarget } from './tv-spatial-navigation';

function target(left: number, top: number, width = 100, height = 150) {
  return {
    getBoundingClientRect: () => ({
      left,
      right: left + width,
      top,
      bottom: top + height,
      width,
      height,
    }),
  };
}

describe('TV spatial navigation', () => {
  it('moves horizontally to the adjacent item in the same row', () => {
    const current = target(200, 300);
    const adjacent = target(320, 300);
    const nextSection = target(200, 600);

    expect(
      findNextSpatialTarget(current, [nextSection, adjacent], 'right')
    ).toBe(adjacent);
  });

  it('moves vertically to the closest aligned item in the next row', () => {
    const current = target(320, 300);
    const aligned = target(320, 600);
    const distant = target(680, 560);

    expect(findNextSpatialTarget(current, [distant, aligned], 'down')).toBe(
      aligned
    );
  });

  it('does not select an item behind the requested direction', () => {
    const current = target(320, 300);
    const above = target(320, 100);

    expect(findNextSpatialTarget(current, [above], 'down')).toBeNull();
  });
});
