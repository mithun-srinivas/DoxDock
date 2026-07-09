import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { addWatermark } from './helpers.js'

export default function WatermarkPdf() {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('CONFIDENTIAL')
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.25)
  const [angle, setAngle] = useState(45)
  const [color, setColor] = useState('#888888')
  const [layout, setLayout] = useState('center')
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () =>
    run((p) =>
      addWatermark(file, { text, fontSize: Number(fontSize), opacity: Number(opacity), angle: Number(angle), color, layout }, p).then(
        (blob) => ({ blob, filename: `${baseName(file.name)}-watermarked.pdf` }),
      ),
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
              <span className="field-label">Watermark text</span>
              <input className="field-input" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Layout</span>
                <select className="field-input" value={layout} onChange={(e) => setLayout(e.target.value)}>
                  <option value="center">Centered</option>
                  <option value="tile">Tiled (repeat)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="field-label">Color</span>
                <input type="color" className="field-input h-[42px] p-1" value={color} onChange={(e) => setColor(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="field-label">Font size: {fontSize}pt</span>
                <input type="range" min="12" max="120" value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full accent-brand-600" />
              </label>
              <label className="space-y-1">
                <span className="field-label">Opacity: {Math.round(opacity * 100)}%</span>
                <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(e.target.value)} className="w-full accent-brand-600" />
              </label>
              <label className="space-y-1">
                <span className="field-label">Angle: {angle}°</span>
                <input type="range" min="0" max="90" value={angle} onChange={(e) => setAngle(e.target.value)} className="w-full accent-brand-600" />
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="droplet" className="h-4 w-4" />
              Add watermark
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Watermark failed">{error}</Note>}
    </div>
  )
}
