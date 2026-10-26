import { findPlayFocusBridgeTarget } from './TvFocusManager';

function requiredElement(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing test element: ${selector}`);
  return element;
}

describe('TV playback focus bridge', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <video data-tv-player></video>
      <div data-tv-section="playback-options">
        <button aria-pressed="true">选集</button>
        <button aria-label="第 2 集">2</button>
      </div>
      <button aria-label="用户菜单">账户</button>
    `;
  });

  it('returns focus from an episode directly to the player', () => {
    const episode = requiredElement('[aria-label="第 2 集"]');
    const player = requiredElement('[data-tv-player]');

    expect(findPlayFocusBridgeTarget(episode, 'up')).toBe(player);
  });

  it('moves down from the player to the active playback tab', () => {
    const player = requiredElement('[data-tv-player]');
    const activeTab = requiredElement('[aria-pressed="true"]');

    expect(findPlayFocusBridgeTarget(player, 'down')).toBe(activeTab);
  });

  it('does not override horizontal navigation', () => {
    const episode = requiredElement('[aria-label="第 2 集"]');

    expect(findPlayFocusBridgeTarget(episode, 'left')).toBeNull();
  });
});
