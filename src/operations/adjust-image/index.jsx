import { useEffect, useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { adjustImages } from './helpers.js'

export default function AdjustImage() {
  const [files, setFiles] = useState([])
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const { running, progress, error, result, run, reset } = useJob()

  const previewUrl = useMemo(() => (files[0] ? URL.createObjectURL(files[0]) : null), [files])
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const pick = (chosen) => {
    setFiles(chosen)
    reset()
  }
  const resetSettings = () => {
    setBrightness(0)
    setContrast(0)
    setSaturation(100)
  }
  const go = () =>
    run((p) =>
      adjustImages(files, {
        brightness: Number(brightness),
        contrast: Number(contrast),
        saturation: Number(saturation),
      }, p),
    )

  const filterStyle = {
    filter: [
      `brightness(${1 + Number(brightness) / 100})`,
      `contrast(${1 + Number(contrast) / 100})`,
      `saturate(${Number(saturation) / 100})`,
    ].join(' '),
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        files={files}
        accept="image/*"
        multiple
        label="Drop one or more images here or click to browse"
        hint="JPEG, PNG, WebP, or AVIF"
        icon="image"
      />

      {files.length > 0 && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {files.length} image{files.length === 1 ? '' : 's'} selected
            </span>
            <span className="text-xs text-slate-400">{formatBytes(files.reduce((n, f) => n + f.size, 0))}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="card flex items-center justify-center overflow-hidden p-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Live preview" style={filterStyle} className="max-h-96 max-w-full object-contain" />
              ) : (
                <Note type="info">Select an image to see a live preview.</Note>
              )}
            </div>

            <div className="card space-y-5 p-4">
              <label className="block space-y-1">
                <span className="field-label">Brightness: {brightness > 0 ? `+${brightness}` : brightness}</span>
                <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(e.target.value)} className="w-full accent-brand-600" />
              </label>
              <label className="block space-y-1">
                <span className="field-label">Contrast: {contrast > 0 ? `+${contrast}` : contrast}</span>
                <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(e.target.value)} className="w-full accent-brand-600" />
              </label>
              <label className="block space-y-1">
                <span className="field-label">Saturation: {saturation}%</span>
                <input type="range" min="0" max="200" value={saturation} onChange={(e) => setSaturation(e.target.value)} className="w-full accent-brand-600" />
              </label>

              <button type="button" className="btn-secondary w-full" onClick={resetSettings}>
                Reset adjustments
              </button>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={go} disabled={running}>
            <Icon name="contrast" className="h-4 w-4" />
            Adjust {files.length > 1 ? `${files.length} images` : 'image'}
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Adjustment failed">{error}</Note>}
      {result && !running && <ResultGallery results={result} zipName="adjusted-images.zip" />}
    </div>
  )
}
