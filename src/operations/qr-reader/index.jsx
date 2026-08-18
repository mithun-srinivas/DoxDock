import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { readQr } from './helpers.js'

export default function QrReader() {
  const [file, setFile] = useState(null)
  const [copied, setCopied] = useState(false)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0] || null)
    setCopied(false)
    reset()
  }

  const go = () => {
    if (!file) return

    setCopied(false)

    run(async (onProgress) => {
      const text = await readQr(file, onProgress)
      return { text }
    })
  }

  const copyResult = async () => {
    if (!result?.text) return

    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="image/*"
        multiple={false}
        label="Drop an image here or click to browse"
        hint="JPEG, PNG, WebP, or another browser-supported image"
        icon="image"
      />

      {file && (
        <div className="card flex items-center gap-3 p-4">
          <Icon name="image" className="h-5 w-5 text-brand-600" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {file.name}
            </p>
            <p className="text-xs text-slate-400">
              Ready to scan
            </p>
          </div>
        </div>
      )}

      {file && (
        <button
          type="button"
          className="btn-primary"
          onClick={go}
          disabled={running}
        >
          <Icon name="grid" className="h-4 w-4" />
          {running ? 'Reading QR code...' : 'Read QR code'}
        </button>
      )}

      {running && progress && (
        <Progress
          value={progress.value}
          message={progress.message}
        />
      )}

      {error && (
        <Note type="error" title="Unable to read QR code">
          {error}
        </Note>
      )}

      {result?.text && !running && (
        <div className="card space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Decoded content</h2>
              <p className="text-xs text-slate-400">
                Text or URL found in the QR code
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={copyResult}
            >
              <Icon name="copy" className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="rounded-lg bg-slate-100 p-4 text-sm break-words dark:bg-slate-800">
            {result.text}
          </div>
        </div>
      )}
    </div>
  )
}
