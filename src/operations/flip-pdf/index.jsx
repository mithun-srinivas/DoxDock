import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { flipPdf } from './helpers.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'

export default function FlipPdf() {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('horizontal')
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () =>
    run((p) =>
      flipPdf(file, { mode }, p).then((blob) => ({
        blob,
        filename: `${baseName(file.name)}-flipped.pdf`,
      })),
    )

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="application/pdf,.pdf"
        multiple={false}
        label="Drop a PDF here or click to browse"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">
              {formatBytes(file.size)}
              {pageCount != null && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="card p-4">
            <label className="space-y-1">
              <span className="field-label">Flip mode</span>
              <select className="field-input" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="horizontal">Horizontal (mirror left ↔ right)</option>
                <option value="vertical">Vertical (mirror top ↔ bottom)</option>
                <option value="both">Both (mirror horizontally and vertically)</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="flip" className="h-4 w-4" />
              Flip PDF
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && (
        <Note type="error" title="Flip failed">
          {error}
        </Note>
      )}
    </div>
  )
}
