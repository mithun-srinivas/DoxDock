import { useState } from 'react'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { markdownToPdf } from './helpers.js'

const SAMPLE = `# DoxDock

**Everything runs in your browser.** No uploads, no network.

## Features
- Markdown to PDF
- Lists, *emphasis*, and \`inline code\`
- Ordered lists:
  1. First
  2. Second

> A blockquote for good measure.

\`\`\`
code block
stays monospaced
\`\`\`
`

export default function MarkdownToPdf() {
  const [text, setText] = useState('')
  const [pageSize, setPageSize] = useState('A4')
  const [fontSize, setFontSize] = useState(11)
  const { running, progress, error, result, run } = useJob()

  const loadFile = (e) => {
    const f = e.target.files?.[0]
    if (f) f.text().then(setText)
    e.target.value = ''
  }
  const go = () => run((p) => markdownToPdf(text, { pageSize, fontSize: Number(fontSize) }, p).then((blob) => ({ blob, filename: 'document.pdf' })))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-secondary cursor-pointer">
          <Icon name="upload" className="h-4 w-4" />
          Load .md file
          <input type="file" accept=".md,.markdown,text/markdown,text/plain" className="sr-only" onChange={loadFile} />
        </label>
        <button type="button" className="btn-ghost" onClick={() => setText(SAMPLE)}>
          Insert sample
        </button>
      </div>

      <label className="block space-y-1">
        <span className="field-label">Markdown</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="# Type or paste Markdown here…"
          className="field-input h-72 font-mono text-sm leading-relaxed"
          spellCheck={false}
        />
      </label>

      <div className="card p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="field-label">Page size</span>
            <select className="field-input" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="field-label">Base font size: {fontSize}pt</span>
            <input type="range" min="9" max="14" value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full accent-brand-600" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={go} disabled={running || !text.trim()}>
          <Icon name="markdown" className="h-4 w-4" />
          Create PDF
        </button>
        {result && <DownloadButton result={result} />}
      </div>

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn’t create the PDF">{error}</Note>}
    </div>
  )
}
