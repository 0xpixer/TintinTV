type WebKitPresentationMode = 'inline' | 'picture-in-picture' | 'fullscreen';

export type WebKitVideoElement = HTMLVideoElement & {
  autoPictureInPicture?: boolean;
  webkitDisplayingFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
  webkitPresentationMode?: WebKitPresentationMode;
  webkitSetPresentationMode?: (mode: WebKitPresentationMode) => void;
  webkitSupportsFullscreen?: boolean;
  webkitSupportsPresentationMode?: (mode: WebKitPresentationMode) => boolean;
};

interface NavigatorLike {
  maxTouchPoints?: number;
  platform?: string;
  userAgent?: string;
}

export function isAppleTouchDevice(navigatorLike: NavigatorLike): boolean {
  const userAgent = navigatorLike.userAgent || '';
  const isIos = /iPad|iPhone|iPod/i.test(userAgent);
  const isTouchMac =
    navigatorLike.platform === 'MacIntel' &&
    (navigatorLike.maxTouchPoints || 0) > 1;
  return isIos || isTouchMac;
}

export function enableAutomaticPictureInPicture(video: HTMLVideoElement) {
  const webKitVideo = video as WebKitVideoElement;
  video.removeAttribute('disablepictureinpicture');
  video.setAttribute('autopictureinpicture', '');
  webKitVideo.autoPictureInPicture = true;
}

export function supportsVideoPictureInPicture(
  video: HTMLVideoElement,
  ownerDocument: Document = document
): boolean {
  const webKitVideo = video as WebKitVideoElement;
  if (webKitVideo.webkitSupportsPresentationMode?.('picture-in-picture')) {
    return true;
  }
  return Boolean(
    ownerDocument.pictureInPictureEnabled && video.requestPictureInPicture
  );
}

export async function requestVideoPictureInPicture(
  video: HTMLVideoElement,
  ownerDocument: Document = document
): Promise<boolean> {
  const webKitVideo = video as WebKitVideoElement;
  if (
    webKitVideo.webkitSupportsPresentationMode?.('picture-in-picture') &&
    webKitVideo.webkitSetPresentationMode
  ) {
    webKitVideo.webkitSetPresentationMode('picture-in-picture');
    return true;
  }
  if (ownerDocument.pictureInPictureEnabled && video.requestPictureInPicture) {
    await video.requestPictureInPicture();
    return true;
  }
  return false;
}

export async function requestNativeVideoFullscreen(
  video: HTMLVideoElement
): Promise<boolean> {
  const webKitVideo = video as WebKitVideoElement;
  if (webKitVideo.webkitEnterFullscreen) {
    webKitVideo.webkitEnterFullscreen();
    return true;
  }
  if (video.requestFullscreen) {
    await video.requestFullscreen();
    return true;
  }
  return false;
}
