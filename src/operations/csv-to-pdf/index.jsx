import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { csvToPdf } from './helpers.js'

export default function CsvToPdf() {
  const [file, setFile] = useState(null)
  const [fontSize, setFontSize] = useState(8)
  const [showHeader, setShowHeader] = useState(true)
  const [orientation, setOrientation] = useState('landscape')
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () =>
    run((p) =>
      csvToPdf(file, { fontSize: Number(fontSize), showHeader, orientation }, p).then(
        (blob) => ({ blob, filename: `${baseName(file.name)}.pdf` }),
      ),
    )

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept=".csv,.tsv,.txt,text/csv" multiple={false} label="Drop a CSV file here or click to browse" hint="Comma, semicolon, or tab delimited" icon="table" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="table" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="card space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="field-label">Orientation</span>
                <select className="field-input" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="field-label">Font size: {fontSize}pt</span>
                <input type="range" min="6" max="14" value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full accent-brand-600" />
              </label>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={showHeader} onChange={(e) => setShowHeader(e.target.checked)} className="accent-brand-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Bold header row</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="table" className="h-4 w-4" />
              Convert to PDF
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Conversion failed">{error}</Note>}
    </div>
  )
}
