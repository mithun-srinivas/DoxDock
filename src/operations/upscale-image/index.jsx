import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { upscaleImages } from './helpers.js'

export default function UpscaleImage() {
  const [files, setFiles] = useState([])
  const [scale, setScale] = useState(2)
  const { running, slow, progress, error, result, run, reset, cancel } = useJob()

  const pick = (next) => {
    setFiles(next)
    reset()
  }
  const go = () => run((p) => upscaleImages(files, { scale }, p))

  const total = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="image/*" multiple label="Drop images here or click to browse" icon="image" />

      {files.length > 0 && (
        <>
          <div className="card flex flex-wrap items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(total)}
            </span>
          </div>

          <div className="card space-y-3 p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Scale</span>
              <div className="flex gap-2">
                {[2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn ${scale === s ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setScale(s)}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn-primary" onClick={go} disabled={running}>
                <Icon name="sparkles" className="h-4 w-4" />
                Upscale {files.length > 1 ? 'Images' : 'Image'}
              </button>
              {slow && (
                <button type="button" className="btn-ghost" onClick={cancel}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Processing failed">{error}</Note>}
      {result && !running && <ResultGallery results={result} zipName="doxdock-upscaled.zip" />}
    </div>
  )
}
