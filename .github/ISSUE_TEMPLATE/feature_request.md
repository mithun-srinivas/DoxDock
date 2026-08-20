---
name: Feature or new tool
about: Suggest a new tool or an improvement to an existing one
title: ''
labels: enhancement
assignees: ''
---

### Short Description
A clear, one or two sentence description of the tool or improvement.

### Scope
- If it is a new tool, follow the plugin pattern: a self-contained `src/operations/<id>/{meta.js,index.jsx,helpers.js}` folder (auto-discovered, no central wiring), reusing shared pieces (Dropzone, useJob, Note, Progress, ResultGallery/ImageResult, imageCanvas).
- Describe the approach and which shared helpers or libraries it should use.
- Must stay 100% client-side: no network calls, no CDNs, no external assets (respect the strict CSP `connect-src 'self'` in `index.html`).

### Acceptance criteria
- [ ] ...
- [ ] ...
- [ ] Runs fully offline.
