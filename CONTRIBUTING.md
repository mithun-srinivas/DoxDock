# Contributing to DoxDock

Thanks for helping build tools people can trust with their private files. Contributions of all kinds are welcome — new operations, bug fixes, accessibility improvements, docs.

## Contribution workflow

Please follow these steps so work doesn't get duplicated and PRs are easy to review.

1. **Find an issue.** Browse the [open issues](https://github.com/mithun-srinivas/DoxDock/issues) — the ones labelled `good first issue` are a great place to start.
2. **Claim it first.** Before you write any code, **comment on the issue and ask to be assigned to it.** Please wait until a maintainer assigns it to you before starting, so two people don't build the same thing.
3. **Work on it.** Once it's assigned to you, create a branch and make your change (see the guides below).
4. **Open a pull request.** When it's ready, open a PR against `main`. In the PR description, please include:
   - **Which issue it closes** — tag it like `Closes #12` so it links to the issue and closes it automatically when merged.
   - **What changed** — a short, plain explanation of what you did and why.
   - **Acceptance criteria** — copy the checklist from the issue and tick off each item you've met.
   - **Proof (if useful)** — a screenshot or short screen recording of the feature working. For anything touching files, a DevTools → Network tab screenshot showing **no external requests** is very welcome.

### PR description template

```markdown
Closes #<issue-number>

**What changed**
- …

**Acceptance criteria** (from the issue)
- [x] …
- [x] …

**Proof**
<screenshot / recording, and a Network-tab shot showing zero external requests if relevant>
```

## The one unbreakable rule

**No runtime network requests. Ever.**

DoxDock's entire reason to exist is that nothing a user opens leaves their machine. A change that adds a CDN link, an external font, an analytics ping, an API call, or any outbound request will be rejected — and the strict CSP in `index.html` (`connect-src 'self'`) is designed to break it at runtime so it can't slip through. Bundle every asset locally. If you add a dependency, verify it doesn't phone home.

Also: never persist user file content. Only non-sensitive UI state (theme, last tool) may go in `localStorage`.

## Getting set up

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve the build
```

## How to add a new operation

DoxDock uses a plugin/registry architecture. Every tool is one self-contained folder — there's no central switch statement to edit. The registry (`src/registry/registry.js`) auto-discovers operations with `import.meta.glob`.

### 1. Create the folder

```
src/operations/my-operation/
├── meta.js       # metadata (required)
├── index.jsx     # the React component (required, default export)
└── helpers.js    # pure functions that do the actual work (recommended)
```

### 2. `meta.js` — describe the tool

```js
export default {
  id: 'my-operation',            // unique, kebab-case; also the URL hash (#/my-operation)
  name: 'My Operation',          // shown in sidebar, palette, header
  description: 'One-line summary of what it does.',
  category: 'pdf',               // 'pdf' | 'image' | 'other'
  icon: 'fileText',              // a key from src/components/Icon.jsx
  order: 40,                     // optional sort order within its category
  notes: 'Optional. Shown as an honest "Good to know" banner — use it for any fidelity limits.',
}
```

If your tool has fidelity limits (approximate layout, lossy, no OCR, etc.), **say so** in `notes`. Honesty about limits is part of the product.

### 3. `helpers.js` — the logic (pure, testable, no React)

Keep the real work here so it's easy to reason about. Take a `File`/input + options, return a `Blob` (or `{ blob, filename }`, or an array for multi-file output). Accept an optional `onProgress(value0to1, message)` for long jobs.

```js
import { PDFDocument } from 'pdf-lib'

export async function doTheThing(file, opts, onProgress) {
  onProgress?.(0.3, 'Working…')
  // ...all client-side...
  const bytes = await someDoc.save()
  onProgress?.(1, 'Done')
  return new Blob([bytes], { type: 'application/pdf' })
}
```

Offload heavy loops (rendering, compression) so the main thread doesn't freeze — pdf.js already uses a worker; `browser-image-compression` runs in one too.

### 4. `index.jsx` — the UI (reuse the shared infrastructure)

Don't reinvent the dropzone, progress bar, or download button — compose the shared pieces:

| Component / hook | Purpose |
|---|---|
| `components/Dropzone.jsx` | Drag-and-drop + file picker (keyboard accessible) |
| `components/FileList.jsx` | Multi-file list with reorder/remove |
| `components/Progress.jsx` | Determinate/indeterminate progress |
| `components/DownloadButton.jsx` | Download a `{ blob, filename }` result |
| `components/ResultGallery.jsx` | Grid of many outputs + "Download all (.zip)" |
| `components/ImageResult.jsx` | Image preview + download (+ size compare) |
| `components/SizeCompare.jsx` | Before/after size bar for compression tools |
| `components/Note.jsx` | Info/warning/error callouts |
| `hooks/useJob.js` | Standardizes running/progress/error/result state |

Minimal skeleton:

```jsx
import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { doTheThing } from './helpers.js'

export default function MyOperation() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  const go = () =>
    run((onProgress) =>
      doTheThing(file, {}, onProgress).then((blob) => ({ blob, filename: 'out.pdf' })),
    )

  return (
    <div className="space-y-6">
      <Dropzone onFiles={(f) => { setFile(f[0]); reset() }} accept="application/pdf,.pdf" multiple={false} />
      {file && <button className="btn-primary" onClick={go} disabled={running}>Run</button>}
      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Failed">{error}</Note>}
      {result && <DownloadButton result={result} />}
    </div>
  )
}
```

That's it — no registration step. The sidebar, search, command palette, and lazy-loading pick it up automatically. Use Tailwind with the shared classes (`btn-primary`, `card`, `field-input`, `field-label`) and the `brand`/`accent` colors so it matches the Aurora theme in both light and dark.

### 5. Add an icon (if needed)

Icons are inline SVG in `src/components/Icon.jsx` (no icon library, to keep the no-CDN guarantee). Add a new entry to the `P` map with the inner SVG markup, then reference its key in your `meta.js`.

## Quality bar

- Works on mobile and desktop; no layout shift; no UI freeze on large files (use progress + workers).
- Dark **and** light mode.
- Accessible: keyboard navigation, visible focus states, labelled controls.
- Clear empty state, sensible defaults, explicit error messages on bad/unsupported input.

## Before you open a PR

- [ ] `npm run build` succeeds.
- [ ] Ran the app, disconnected the network, confirmed your tool still works.
- [ ] DevTools → Network shows **zero** requests to any external origin.
- [ ] No user file content written to `localStorage`.
- [ ] Fidelity limits (if any) are stated in the UI via `meta.notes`.
- [ ] Works in light and dark mode, and via keyboard.

Thank you for keeping DoxDock honest. 🌿
