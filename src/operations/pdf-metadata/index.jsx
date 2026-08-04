import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'
import { METADATA_FIELDS, emptyMetadata, readPdfMetadata, writePdfMetadata } from './helpers.js'

export default function PdfMetadata() {
  const [file, setFile] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loadError, setLoadError] = useState('')
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)

  const pick = async (files) => {
    const f = files[0]
    setFile(f)
    setMeta(null)
    setLoadError('')
    reset()
    try {
      setMeta(await readPdfMetadata(f))
    } catch (e) {
      setLoadError(e.message)
    }
  }

  const setField = (key) => (e) => setMeta({ ...meta, [key]: e.target.value })

  const go = () =>
    run((p) =>
      writePdfMetadata(file, meta, p).then((blob) => ({
        blob,
        filename: `${baseName(file.name)}-metadata.pdf`,
      })),
    )

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" icon="fileText" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}{pageCount != null && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}</span>
          </div>

          {meta && (
            <>
              <div className="card p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {METADATA_FIELDS.map(({ key, label, hint }) => (
                    <label key={key} className="space-y-1">
                      <span className="field-label">{label}</span>
                      <input type="text" className="field-input" value={meta[key]} onChange={setField(key)} placeholder={hint || ''} />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-primary" onClick={go} disabled={running}>
                  <Icon name="pencil" className="h-4 w-4" />
                  Save metadata
                </button>
                <button type="button" className="btn-secondary" onClick={() => setMeta(emptyMetadata())} disabled={running}>
                  <Icon name="eraser" className="h-4 w-4" />
                  Clear all
                </button>
                {result && <DownloadButton result={result} />}
              </div>
            </>
          )}
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {loadError && <Note type="error" title="Couldn’t read metadata">{loadError}</Note>}
      {error && <Note type="error" title="Couldn’t save metadata">{error}</Note>}
    </div>
  )
}
