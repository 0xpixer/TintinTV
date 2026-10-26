'use strict';

module.exports = function legacyWebViewLoader(source) {
  this.cacheable?.();

  // XGIMI's Android 8 WebView uses Chromium 62, which cannot parse the
  // optional catch binding currently emitted by Next.js' URL helper.
  return source.replace(/\bcatch\s*\{/g, 'catch (__tintintvLegacyError) {');
};
