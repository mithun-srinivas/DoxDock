import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import SizeCompare from '../../components/SizeCompare.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { compressPdf } from './helpers.js'

// One click for the common cases. Every dpi here is an option the Resolution select already
// offers and every quality sits inside the slider's 0.3-0.95 range, so a preset can never
// leave a control showing a value it cannot represent. Medium is the existing default pair.
const COMPRESSION_PRESETS = [
  { id: 'low', label: 'Low', dpi: 200, quality: 0.85 },
  { id: 'medium', label: 'Medium', dpi: 120, quality: 0.7 },
  { id: 'high', label: 'High', dpi: 72, quality: 0.5 },
]

export default function CompressPdf() {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('rasterize')
  const [dpi, setDpi] = useState(120)
  const [quality, setQuality] = useState(0.7)
  const { running, progress, error, result, run, reset, cancel, slow } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () =>
    run((p) =>
      compressPdf(file, { mode, dpi: Number(dpi), quality: Number(quality) }, p).then((r) => ({
        ...r,
        blob: r.blob,
        filename: `${baseName(file.name)}-compressed.pdf`,
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
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="card space-y-4 p-4">
            <label className="block space-y-1">
              <span className="field-label">Method</span>
              <select className="field-input" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="rasterize">Re-encode pages (best shrink; text becomes non-selectable)</option>
                <option value="metadata">Strip metadata only (lossless; keeps text)</option>
              </select>
            </label>

            {mode === 'rasterize' && (
              <div className="space-y-1">
                <span className="field-label">Preset</span>
                <div className="flex flex-wrap gap-2">
                  {COMPRESSION_PRESETS.map((preset) => {
                    const active = Number(dpi) === preset.dpi && Number(quality) === preset.quality
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setDpi(preset.dpi)
                          setQuality(preset.quality)
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-300 hover:border-brand-600 dark:border-slate-600'
                        }`}
                      >
                        {preset.label}
                        <span className={`ml-1.5 text-xs ${active ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                          {preset.dpi} dpi · {Math.round(preset.quality * 100)}%
                        </span>
                      </button>
                    )
                  })}
                </div>
                {/* "High" is ambiguous on its own — say which way it goes. */}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Higher compression means a smaller file and a softer page. The sliders below stay editable.
                </p>
              </div>
            )}

            {mode === 'rasterize' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="field-label">Resolution</span>
                  <select className="field-input" value={dpi} onChange={(e) => setDpi(e.target.value)}>
                    <option value={72}>72 dpi (smallest)</option>
                    <option value={96}>96 dpi</option>
                    <option value={120}>120 dpi (balanced)</option>
                    <option value={150}>150 dpi</option>
                    <option value={200}>200 dpi (sharp)</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="field-label">JPEG quality: {Math.round(quality * 100)}%</span>
                  <input type="range" min="0.3" max="0.95" step="0.05" value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full accent-brand-600" />
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="compress" className="h-4 w-4" />
              Compress PDF
            </button>
            {running && slow && (
              <button type="button" onClick={cancel}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500 bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 hover:border-red-600 transition-colors">
                <Icon name="x" className="h-4 w-4" />
                Cancel
              </button>
            )}
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Compression failed">{error}</Note>}
      {result && !running && (
        <>
          <SizeCompare before={result.before} after={result.after} />
          {result.after >= result.before && (
            <Note type="warning">This PDF didn’t get smaller — it’s likely already optimized or text-only. Try the other method or lower settings.</Note>
          )}
        </>
      )}
    </div>
  )
}
