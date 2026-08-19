# DoxDock as a Chrome extension

Package the DoxDock web app as a Manifest V3 Chrome extension. The whole app,
including the on-device AI tools, ships inside the extension and runs entirely
on the user's machine. Nothing is loaded from a server, and no user file ever
leaves the device.

## Build

From the repo root:

```bash
npm run build                     # build the app into dist/
node extension/build-extension.mjs   # package dist/ into extension/build/
```

The packager:

- copies the built app (including `public/ort` and `public/models`) into
  `extension/build/`,
- writes a Manifest V3 `manifest.json` (with `wasm-unsafe-eval` for the wasm and
  AI tools) and the toolbar icons,
- adds `background.js`, whose only job is to open the app in a new tab when the
  toolbar icon is clicked,
- strips the PWA service worker (service workers cannot register on a
  `chrome-extension://` page, and the extension is already fully local) and the
  `frame-ancestors` CSP directive (ignored in a meta tag).

`extension/build/` is a build artifact and is not committed.

## Load it locally (development)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select `extension/build`
4. Pin the DoxDock icon and click it. The app opens in a new tab, served entirely
   from the extension.

## Notes

- When the app runs as an extension it uses hash routing (`index.html#/merge-pdfs`)
  so reloads work; on the web it keeps clean path routing for SEO. This is
  handled automatically (`IS_EXTENSION` in `src/App.jsx`).
- The build is around 50 MB because the AI model and ONNX runtime are bundled for
  full offline use. For a smaller Web Store package, the AI models can be
  lazy-downloaded on first use of those tools instead of bundled.

## Publish to the Chrome Web Store

See the steps in the project release notes, or the short version:

1. Build the extension (above), then zip the **contents** of `extension/build`
   (the manifest must be at the root of the zip):
   ```bash
   cd extension/build && zip -r ../doxdock-extension.zip . && cd -
   ```
2. Create a Chrome Web Store developer account (one-time 5 USD fee) at
   https://chrome.google.com/webstore/devconsole
3. Click **Add new item**, upload the zip, and fill in the listing (name,
   description, screenshots, privacy policy, category).
4. In the privacy section, declare that the extension collects no data and makes
   no network requests. This is easy to justify: it is open source and the CSP
   allows only same-origin loads.
5. Submit for review. Approval usually takes a few days.

## Auto-upload on release (CI)

The workflow `.github/workflows/publish-extension.yml` runs when a GitHub release
is published. It builds the app, packages the extension, and uploads the new
version to the Chrome Web Store as a **draft** (it does not publish it, so you
review and click Publish yourself in the dashboard).

It needs three repository secrets (Settings > Secrets and variables > Actions):

- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`

Get them from a Google Cloud project with the Chrome Web Store API enabled. The
`npx chrome-webstore-upload-keys` helper walks you through the OAuth consent flow
and prints the refresh token. Until these secrets exist, the upload step is
skipped, so releases never fail. The version comes from `package.json`, which the
release flow already bumps, so each upload has a fresh version number.
