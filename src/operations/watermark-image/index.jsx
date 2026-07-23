import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { watermarkImages, POSITIONS } from './helpers.js'

export default function WatermarkImage() {
  const [files, setFiles] = useState([])
  const [mode, setMode] = useState('text')
  const [text, setText] = useState('CONFIDENTIAL')
  const [logo, setLogo] = useState(null)
  const [position, setPosition] = useState('bottom-right')
  const [layout, setLayout] = useState('single')
  const [opacity, setOpacity] = useState(0.35)
  const [scale, setScale] = useState(0.25)
  const [color, setColor] = useState('#ffffff')
  const [angle, setAngle] = useState(30)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (picked) => {
    setFiles(picked)
    reset()
  }
  const go = () =>
    run((p) =>
      watermarkImages(
        files,
        {
          mode,
          text,
          logo,
          position,
          layout,
          opacity: Number(opacity),
          scale: Number(scale),
          color,
          angle: Number(angle),
        },
        p,
      ),
    )

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="image/*"
        multiple
        label="Drop images here or click to browse"
        hint="Watermark one image or a whole batch — all of them get the same mark"
        icon="image"
      />

      {files.length > 0 && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {files.length === 1 ? files[0].name : `${files.length} images`}
            </span>
            <span className="text-xs text-slate-400">
              {formatBytes(files.reduce((sum, f) => sum + f.size, 0))}
            </span>
          </div>

          <div className="card space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Watermark</span>
                <select
                  className="field-input"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="logo">Logo image</option>
                </select>
              </label>

              {mode === 'text' ? (
                <label className="space-y-1">
                  <span className="field-label">Text</span>
                  <input
                    className="field-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                  />
                </label>
              ) : (
                <label className="space-y-1">
                  <span className="field-label">Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="field-input"
                    onChange={(e) => {
                      setLogo(e.target.files?.[0] || null)
                      reset()
                    }}
                  />
                </label>
              )}

              <label className="space-y-1">
                <span className="field-label">Layout</span>
                <select
                  className="field-input"
                  value={layout}
                  onChange={(e) => setLayout(e.target.value)}
                >
                  <option value="single">Single placement</option>
                  <option value="tile">Tiled across the image</option>
                </select>
              </label>

              {layout === 'single' ? (
                <label className="space-y-1">
                  <span className="field-label">Position</span>
                  <select
                    className="field-input"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="space-y-1">
                  <span className="field-label">Angle: {angle}°</span>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={angle}
                    onChange={(e) => setAngle(e.target.value)}
                    className="w-full accent-brand-600"
                  />
                </label>
              )}

              <label className="space-y-1">
                <span className="field-label">Opacity: {Math.round(opacity * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(e.target.value)}
                  className="w-full accent-brand-600"
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">Size: {Math.round(scale * 100)}% of width</span>
                <input
                  type="range"
                  min="0.05"
                  max="1"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                  className="w-full accent-brand-600"
                />
              </label>

              {mode === 'text' && (
                <label className="space-y-1">
                  <span className="field-label">Color</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="field-input h-10 p-1"
                  />
                </label>
              )}
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={go} disabled={running}>
            <Icon name="droplet" className="h-4 w-4" />
            {files.length > 1 ? `Watermark ${files.length} images` : 'Add watermark'}
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Watermark failed">{error}</Note>}
      {result && !running && (
        <ResultGallery results={result} zipName="doxdock-watermarked.zip" />
      )}
    </div>
  )
}
