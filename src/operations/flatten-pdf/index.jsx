import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { flattenPdf } from './helpers.js'

export default function FlattenPdf() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => flattenPdf(file, p))

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="application/pdf"
        multiple={false}
        label="Drop a PDF here or click to browse"
        hint="A filled or signed form can still be re-filled until it is flattened"
        icon="layers"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="layers" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="layers" className="h-4 w-4" />
              Flatten PDF
            </button>
            {result && !running && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && (
        <Note type="error" title="Couldn’t flatten this PDF">
          {error}
        </Note>
      )}
      {result && !running && (
        <Note type="info" title="Done">
          {summarize(result.report)} The pages look the same, but nothing is left to re-fill or
          re-edit.
        </Note>
      )}
    </div>
  )
}

/** Say what actually got baked, rather than a bare "done". */
function summarize(report) {
  if (!report) return ''
  const parts = []
  if (report.fields > 0) parts.push(`${report.fields} form field(s)`)
  if (report.baked > 0) parts.push(`${report.baked} annotation(s)`)

  const baked = parts.length ? `Baked in ${parts.join(' and ')}.` : ''
  const dropped =
    report.dropped > 0
      ? ` Removed ${report.dropped} hidden annotation(s) or link hotspot(s), which are not drawn on the page.`
      : ''
  return baked + dropped
}
