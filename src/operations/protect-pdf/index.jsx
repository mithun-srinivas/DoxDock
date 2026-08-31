import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { protectPdf } from './helpers.js'

export default function ProtectPdf() {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0] || null)
    setPassword('')
    setConfirmPassword('')
    reset()
  }

  const passwordMismatch = password && confirmPassword && password !== confirmPassword

  const go = () => {
    if (!password.trim()) return
    if (password !== confirmPassword) return

    run((onProgress) =>
      protectPdf(file, password, onProgress).then((blob) => ({
        blob,
        filename: `${baseName(file.name)}-protected.pdf`,
      })),
    )
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="application/pdf,.pdf"
        multiple={false}
        label="Drop a PDF here or click to browse"
        hint="The PDF stays in your browser and is never uploaded"
        icon="lock"
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
              <span className="field-label">Password</span>
              <input
                type="password"
                className="field-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  reset()
                }}
                autoComplete="new-password"
                placeholder="Enter a strong password"
              />
            </label>

            <label className="block space-y-1">
              <span className="field-label">Confirm password</span>
              <input
                type="password"
                className="field-input"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  reset()
                }}
                autoComplete="new-password"
                placeholder="Re-enter the password"
              />
            </label>

            {passwordMismatch && (
              <Note type="error" title="Passwords do not match">
                Enter the same password in both fields.
              </Note>
            )}

            <Note type="warning" title="Important">
              The password cannot be recovered if you forget it. Save it somewhere secure before protecting
              the PDF.
            </Note>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={go}
              disabled={
                running || !password.trim() || !confirmPassword.trim() || password !== confirmPassword
              }
            >
              <Icon name="lock" className="h-4 w-4" />
              Protect PDF
            </button>

            {result && !running && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}

      {error && (
        <Note type="error" title="Protection failed">
          {error}
        </Note>
      )}

      {result && !running && (
        <Note type="info" title="PDF protected">
          The output PDF is encrypted and requires the password you entered to open.
        </Note>
      )}
    </div>
  )
}
