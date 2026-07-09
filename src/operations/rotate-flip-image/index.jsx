import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { rotateFlipImage } from './helpers.js'

export default function RotateFlipImage() {
  const [file, setFile] = useState(null)
  const [rotate, setRotate] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => rotateFlipImage(file, { rotate: Number(rotate), flipH, flipV }, p))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="image/*" multiple={false} label="Drop an image here or click to browse" icon="image" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="card space-y-4 p-4">
            <label className="block space-y-1">
              <span className="field-label">Rotate</span>
              <div className="flex flex-wrap gap-2">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setRotate(deg)}
                    className={Number(rotate) === deg ? 'btn-primary' : 'btn-secondary'}
                  >
                    {deg === 0 ? 'None' : `${deg}°`}
                  </button>
                ))}
              </div>
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={flipH} onChange={(e) => setFlipH(e.target.checked)} />
                Flip horizontal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={flipV} onChange={(e) => setFlipV(e.target.checked)} />
                Flip vertical
              </label>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={go} disabled={running}>
            <Icon name="flip" className="h-4 w-4" />
            Apply
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Transform failed">{error}</Note>}
      {result && !running && <ImageResult result={result} />}
    </div>
  )
}
