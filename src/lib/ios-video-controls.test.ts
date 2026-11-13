import {
  enableAutomaticPictureInPicture,
  isAppleTouchDevice,
  requestNativeVideoFullscreen,
  requestVideoPictureInPicture,
  supportsVideoPictureInPicture,
  WebKitVideoElement,
} from './ios-video-controls';

function mockVideo(overrides: Partial<WebKitVideoElement> = {}) {
  const video = document.createElement('video') as WebKitVideoElement;
  Object.assign(video, overrides);
  return video;
}

describe('iOS video controls', () => {
  it('detects iPhone and touch-enabled iPad user agents', () => {
    expect(
      isAppleTouchDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS)' })
    ).toBe(true);
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Macintosh)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      })
    ).toBe(true);
    expect(
      isAppleTouchDevice({
        userAgent: 'Mozilla/5.0 (Macintosh)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      })
    ).toBe(false);
  });

  it('enables automatic picture in picture', () => {
    const video = mockVideo();
    video.setAttribute('disablepictureinpicture', '');

    enableAutomaticPictureInPicture(video);

    expect(video.hasAttribute('disablepictureinpicture')).toBe(false);
    expect(video.hasAttribute('autopictureinpicture')).toBe(true);
    expect(video.autoPictureInPicture).toBe(true);
  });

  it('prefers the WebKit presentation mode on Safari', async () => {
    const setPresentationMode = jest.fn();
    const video = mockVideo({
      webkitSupportsPresentationMode: jest.fn().mockReturnValue(true),
      webkitSetPresentationMode: setPresentationMode,
    });

    expect(supportsVideoPictureInPicture(video)).toBe(true);
    await expect(requestVideoPictureInPicture(video)).resolves.toBe(true);
    expect(setPresentationMode).toHaveBeenCalledWith('picture-in-picture');
  });

  it('uses native WebKit fullscreen when available', async () => {
    const enterFullscreen = jest.fn();
    const requestFullscreen = jest.fn().mockResolvedValue(undefined);
    const video = mockVideo({
      webkitEnterFullscreen: enterFullscreen,
      requestFullscreen,
    });

    await expect(requestNativeVideoFullscreen(video)).resolves.toBe(true);
    expect(enterFullscreen).toHaveBeenCalledTimes(1);
    expect(requestFullscreen).not.toHaveBeenCalled();
  });
});
