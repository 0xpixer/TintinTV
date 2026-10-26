import { getTvPlayerFeedback, handleTvPlayerKey } from './tv-player-controls';

function mockVideo(overrides: Partial<HTMLVideoElement> = {}) {
  return {
    currentTime: 40,
    duration: 120,
    paused: false,
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    requestFullscreen: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as HTMLVideoElement;
}

describe('TV player remote controls', () => {
  it('seeks with left and right without moving page focus', () => {
    const video = mockVideo();
    expect(handleTvPlayerKey(video, 'ArrowRight', true)).toBe(true);
    expect(video.currentTime).toBe(50);
    expect(handleTvPlayerKey(video, 'ArrowLeft', true)).toBe(true);
    expect(video.currentTime).toBe(40);
  });

  it('starts paused playback and requests fullscreen on confirm', () => {
    const video = mockVideo({ paused: true });
    expect(handleTvPlayerKey(video, 'Enter', false)).toBe(true);
    expect(video.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it('fullscreens the stable player shell instead of the video surface', () => {
    const shell = {
      requestFullscreen: jest.fn().mockResolvedValue(undefined),
    } as unknown as HTMLElement;
    const video = mockVideo({
      paused: true,
      closest: jest.fn().mockReturnValue(shell),
    });

    handleTvPlayerKey(video, 'Enter', false);

    expect(shell.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(video.requestFullscreen).not.toHaveBeenCalled();
  });

  it('toggles pause only after playback is already fullscreen', () => {
    const video = mockVideo();
    expect(handleTvPlayerKey(video, 'Enter', false)).toBe(true);
    expect(video.pause).not.toHaveBeenCalled();
    expect(handleTvPlayerKey(video, 'Enter', true)).toBe(true);
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('consumes vertical movement during playback', () => {
    const video = mockVideo();
    expect(handleTvPlayerKey(video, 'ArrowUp', false)).toBe(true);
    expect(handleTvPlayerKey(video, 'ArrowDown', false)).toBe(true);
  });

  it('describes seek feedback for the temporary TV overlay', () => {
    const video = mockVideo({ currentTime: 50 });
    expect(getTvPlayerFeedback(video, 'ArrowRight', false)).toEqual({
      message: '快进 10 秒',
      currentTime: 50,
      duration: 120,
    });
  });
});
