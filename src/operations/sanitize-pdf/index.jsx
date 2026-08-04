import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { sanitizePdf } from './helpers.js'

const OPTIONS = [
  {
    key: 'javascript',
    label: 'Embedded JavaScript',
    hint: 'Document scripts, open actions and event handlers',
  },
  {
    key: 'embeddedFiles',
    label: 'Attached files',
    hint: 'Files carried inside the PDF, including attachment annotations',
  },
  {
    key: 'metadata',
    label: 'Metadata',
    hint: 'Title, author, timestamps and the XMP packet',
  },
  {
    key: 'annotations',
    label: 'Annotations',
    hint: 'Comments, links, stamps and form fields — changes what you see',
  },
]

export default function SanitizePdf() {
  const [file, setFile] = useState(null)
  // Annotations are off by default: unlike the others they are visible content.
  const [opts, setOpts] = useState({
    javascript: true,
    embeddedFiles: true,
    metadata: true,
    annotations: false,
  })
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const toggle = (key) => {
    setOpts((prev) => ({ ...prev, [key]: !prev[key] }))
    reset()
  }
  const nothingSelected = !Object.values(opts).some(Boolean)
  const go = () => run((p) => sanitizePdf(file, opts, p))

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="application/pdf"
        multiple={false}
        label="Drop a PDF here or click to browse"
        hint="PDFs can carry scripts, hidden attachments and metadata you did not intend to share"
        icon="lock"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="layers" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="card space-y-3 p-4">
            <span className="field-label">Remove</span>
            {OPTIONS.map(({ key, label, hint }) => (
              <label key={key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={opts[key]}
                  onChange={() => toggle(key)}
                  className="mt-1 accent-brand-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-slate-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={go}
              disabled={running || nothingSelected}
            >
              <Icon name="lock" className="h-4 w-4" />
              Sanitize PDF
            </button>
            {result && !running && <DownloadButton result={result} />}
          </div>

          {nothingSelected && <Note type="info">Choose at least one thing to remove.</Note>}
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn’t sanitize this PDF">{error}</Note>}
      {result && !running && (
        <Note type="info" title="Done">
          {summarize(result.report)} The visible pages are unchanged.
        </Note>
      )}
    </div>
  )
}

/** A plain-language summary of what came out, rather than raw counts. */
function summarize(report) {
  if (!report) return ''
  const parts = []
  if (report.javascript > 0) parts.push('embedded JavaScript')
  if (report.embeddedFiles > 0) parts.push('attached files')
  if (report.metadata > 0) parts.push('metadata')
  if (report.annotations > 0) parts.push(`${report.annotations} annotation(s)`)
  if (parts.length === 0) return 'This PDF had none of the selected items — nothing to remove.'
  return `Removed: ${parts.join(', ')}.`
}
