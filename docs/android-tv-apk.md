# TintinTV Android TV APK

This repo includes a small native Android TV WebView shell in `android-tv/`.
It is intended for private side-loading on Android TV devices such as XGIMI
projectors and Amazon Fire TV. The interface uses larger focus targets and
remote-control navigation when opened in the APK; the regular website is
unchanged. The APK opens `https://www.tintintv.app` by default.

## Authentication

The APK does not store your TintinTV username or password. Instead, it calls
`POST /api/tv-auth` with a private TV token and receives the normal `auth`
cookie used by the web app.

Set the same token in both places:

- Server environment variable: `TV_ACCESS_TOKEN`
- Local Android build file: `android-tv/local.properties`

`android-tv/local.properties` is ignored by git and should stay local because it
contains the APK token and release signing details.

## Build

```bash
pnpm apk:tv
```

The installable APK is copied to:

```text
dist/tintintv-tv.apk
```

## Side-load

For a device with ADB debugging enabled:

```bash
adb connect DEVICE_IP:5555
adb install -r dist/tintintv-tv.apk
```

You can also move `dist/tintintv-tv.apk` to a USB drive or downloader app and
install it manually on the TV device. For an XGIMI projector, copy the APK to a
USB drive, open it with the projector's file manager, and allow app installation
from that file manager if prompted. Select TintinTV in the app list after
installation. The exact USB/file-manager menus depend on the projector model.

The server must have the same `TV_ACCESS_TOKEN` configured before first launch.
This APK embeds the token, so keep the APK private. It cannot be used offline;
both the website and third-party video sources need network access. Android TV
6.0 (API 23) or newer is required. Compatibility with a particular XGIMI model
still needs an on-device check.
