import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { unlockPdf } from './helpers.js'

export default function UnlockPdf() {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0] || null)
    setPassword('')
    reset()
  }

  const go = () => {
    if (!password.trim()) return

    run((onProgress) =>
      unlockPdf(file, password, onProgress).then((blob) => ({
        blob,
        filename: `${baseName(file.name)}-unlocked.pdf`,
      })),
    )
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="application/pdf,.pdf"
        multiple={false}
        label="Drop a protected PDF here or click to browse"
        hint="The PDF stays in your browser and is never uploaded"
        icon="unlock"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="card space-y-4 p-4">
            <label className="block space-y-1">
              <span className="field-label">PDF password</span>
              <input
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  reset()
                }}
                autoComplete="off"
                placeholder="Enter the existing PDF password"
              />
            </label>

            <Note type="info" title="Known password required">
              This tool only removes protection when you already know the PDF password. It cannot crack or
              bypass a password.
            </Note>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running || !password.trim()}>
              <Icon name="unlock" className="h-4 w-4" />
              Unlock PDF
            </button>

            {result && !running && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}

      {error && (
        <Note type="error" title="Unlock failed">
          {error}
        </Note>
      )}

      {result && !running && (
        <Note type="info" title="PDF unlocked">
          The downloaded PDF no longer requires a password to open.
        </Note>
      )}
    </div>
  )
}
