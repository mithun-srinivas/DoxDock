import { useState, useEffect, useRef } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { adjustImage, adjustImages, buildFilter } from './helper.js'

const DEFAULTS = { brightness: 100, contrast: 100, saturation: 100 }

const SLIDERS = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 200 },
  { key: 'contrast',   label: 'Contrast',   min: 0, max: 200 },
  { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
]

export default function ImageAdjustment() {
  const [files, setFiles] = useState([])
  const [adj, setAdj] = useState(DEFAULTS)
  const [previewUrl, setPreviewUrl] = useState(null)
  const { running, slow, progress, error, result, run, reset, cancel } = useJob()
  const previewRef = useRef(null)

  // Generate live preview for the first file whenever adjustments or file changes
  useEffect(() => {
    const file = files[0]
    if (!file) { setPreviewUrl(null); return }
    let cancelled = false
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.filter = buildFilter(adj)
      ctx.drawImage(img, 0, 0)
      canvas.toBlob((blob) => {
        if (cancelled) return
        const prev = URL.createObjectURL(blob)
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return prev })
      }, 'image/jpeg', 0.85)
      URL.revokeObjectURL(url)
    }
    img.src = url
    return () => { cancelled = true; URL.revokeObjectURL(url) }
  }, [files, adj])

  const pick = (incoming) => {
    setFiles(incoming.filter((f) => f.type.startsWith('image/')))
    reset()
  }

  const set = (key, value) => setAdj((prev) => ({ ...prev, [key]: Number(value) }))
  const resetAdj = () => { setAdj(DEFAULTS); reset() }

  const go = () => {
    if (files.length === 1) {
      run((p) => adjustImage(files[0], adj, p))
    } else {
      run((p) => adjustImages(files, adj, p))
    }
  }

  const isBatch = files.length > 1

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="image/*" multiple label="Drop images here or click to browse" icon="image" />

      {files.length > 0 && (
        <>
          {/* File list summary */}
          <div className="card p-3">
            <div className="flex items-center gap-3">
              <Icon name="image" className="h-5 w-5 text-brand-600" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {isBatch ? `${files.length} images selected` : files[0].name}
              </span>
              <span className="text-xs text-slate-400">
                {isBatch
                  ? formatBytes(files.reduce((a, f) => a + f.size, 0))
                  : formatBytes(files[0].size)}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sliders */}
            <div className="card space-y-4 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Adjustments</p>
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={resetAdj}>
                  Reset
                </button>
              </div>
              {SLIDERS.map(({ key, label, min, max }) => (
                <label key={key} className="block space-y-1">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{label}</span>
                    <span className="tabular-nums">{adj[key]}%</span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    value={adj[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="w-full accent-brand-600"
                  />
                </label>
              ))}
            </div>

            {/* Live preview */}
            <div className="card overflow-hidden">
              <div className="flex aspect-video items-center justify-center bg-slate-100 dark:bg-slate-800">
                {previewUrl ? (
                  <img ref={previewRef} src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-sm text-slate-400">Preview will appear here</span>
                )}
              </div>
              <p className="px-3 py-2 text-xs text-slate-400">Live preview (first image)</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="sliders" className="h-4 w-4" />
              {isBatch ? `Apply to ${files.length} images` : 'Apply adjustments'}
            </button>
            {running && slow && (
              <button type="button" onClick={cancel}
                className="flex items-center gap-1.5 rounded-lg border border-red-500 bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors">
                <Icon name="x" className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Adjustment failed">{error}</Note>}

      {result && !running && (
        Array.isArray(result)
          ? <ResultGallery results={result} zipName="adjusted-images.zip" />
          : <ImageResult result={result} />
      )}
    </div>
  )
}
