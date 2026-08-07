import { useState, useEffect } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import Cropper from './Cropper.jsx'
import { useJob } from '../../hooks/useJob.js'
import { decode, dimsOf, IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'
import { cropImage } from './helpers.js'

export default function CropImage() {
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState(null)
  const [natural, setNatural] = useState(null)
  const [sel, setSel] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  const pick = async (files) => {
    const f = files[0]
    reset()
    setFile(f)
    try {
      const bmp = await decode(f)
      const d = dimsOf(bmp)
      setNatural(d)
      // default selection: centered 80%
      setSel({ x: Math.round(d.width * 0.1), y: Math.round(d.height * 0.1), w: Math.round(d.width * 0.8), h: Math.round(d.height * 0.8) })
      bmp.close?.()
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(f)
      })
    } catch {
      setNatural(null)
    }
  }

  const go = () => run((p) => cropImage(file, sel, p))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="image/*" multiple={false} label="Drop an image here or click to browse" hint={IMAGE_FORMATS_HINT} icon="image" />

      {file && natural && sel && (
        <>
          <div className="card p-4">
            <div className="flex justify-center">
              <Cropper url={url} natural={natural} sel={sel} onChange={setSel} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {['x', 'y', 'w', 'h'].map((k) => (
                <label key={k} className="space-y-1">
                  <span className="field-label uppercase">{k}</span>
                  <input
                    type="number"
                    className="field-input"
                    value={sel[k]}
                    min="0"
                    onChange={(e) => setSel((s) => ({ ...s, [k]: Math.max(0, Number(e.target.value)) }))}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Source: {natural.width}×{natural.height}px. Crop: {sel.w}×{sel.h}px.</p>
          </div>

          <button type="button" className="btn-primary" onClick={go} disabled={running}>
            <Icon name="crop" className="h-4 w-4" />
            Crop
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Crop failed">{error}</Note>}
      {result && !running && <ImageResult result={result} />}
    </div>
  )
}
