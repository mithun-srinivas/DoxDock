import { useEffect, useState } from 'react'
import Icon from '../../components/Icon.jsx'
import Note from '../../components/Note.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { generateQr, qrDataUrl } from './helpers.js'

const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H']

export default function QrCodeGenerator() {
  const [content, setContent] = useState('Hello, DoxDock')
  const [size, setSize] = useState(256)
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState('M')
  const [foreground, setForeground] = useState('#000000')
  const [background, setBackground] = useState('#ffffff')
  const [preview, setPreview] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const url = await qrDataUrl(content, {
          size,
          errorCorrectionLevel,
          foreground,
          background,
        })
        if (!cancelled) setPreview(url)
      } catch {
        if (!cancelled) setPreview(null)
      }
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [content, size, errorCorrectionLevel, foreground, background])

  const go = () => {
    reset()
    run((p) => generateQr({ content, size, errorCorrectionLevel, foreground, background }, p))
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="field-label">Content</label>
        <textarea
          className="field-input min-h-28 font-mono"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Text, URL, WIFI:S:name;T:WPA;P:password;;, or vCard"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Size</span>
          <input
            className="field-input"
            type="number"
            min={128}
            max={1024}
            step={32}
            value={size}
            onChange={(event) => setSize(Number(event.target.value) || 256)}
          />
        </label>
        <label className="block">
          <span className="field-label">Error correction</span>
          <select
            className="field-input"
            value={errorCorrectionLevel}
            onChange={(event) => setErrorCorrectionLevel(event.target.value)}
          >
            {ERROR_CORRECTION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level === 'L' ? 'Low' : level === 'M' ? 'Medium' : level === 'Q' ? 'Quartile' : 'High'}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Foreground</span>
          <input
            className="field-input h-11"
            type="color"
            value={foreground}
            onChange={(event) => setForeground(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="field-label">Background</span>
          <input
            className="field-input h-11"
            type="color"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
          />
        </label>
      </div>

      <div className="card flex flex-col items-center gap-3 p-4">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Live preview</span>
        <div className="flex min-h-48 items-center justify-center rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
          {preview ? (
            <img src={preview} alt="QR code preview" className="max-h-72 max-w-full object-contain" />
          ) : (
            <span className="text-sm text-slate-400">Enter content to render the preview.</span>
          )}
        </div>
      </div>

      <button type="button" className="btn-primary" onClick={go} disabled={running}>
        <Icon name="grid" className="h-4 w-4" />
        Generate QR code
      </button>

      {running && progress && (
        <Note type="info" title={progress.message}>
          {progress.value != null ? `${Math.round(progress.value * 100)}%` : 'Working…'}
        </Note>
      )}
      {error && <Note type="error" title="QR generation failed">{error}</Note>}
      {result && !running && <ResultGallery results={result} zipName="qr-code.zip" />}
    </div>
  )
}
