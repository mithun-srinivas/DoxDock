import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { canEncode } from '../../lib/imageCanvas.js'
import { convertImage } from './helpers.js'

export default function ConvertImage() {
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState(0.9)
  const { running, progress, error, result, run, reset } = useJob()
  const [avifSupported] = useState(() => canEncode('image/avif'))

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => convertImage(file, { format, quality: Number(quality) }, p))

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

          <div className="card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Convert to</span>
                <select className="field-input" value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                  <option value="avif" disabled={!avifSupported}>
                    AVIF{avifSupported ? '' : ' (unsupported in this browser)'}
                  </option>
                </select>
                {format === 'avif' && !avifSupported && (
                  <span className="field-label mt-1">This browser cannot encode AVIF.</span>
                )}
              </label>
              {format !== 'png' && (
                <label className="space-y-1">
                  <span className="field-label">Quality: {Math.round(quality * 100)}%</span>
                  <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full accent-brand-600" />
                </label>
              )}
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={go} disabled={running}>
            <Icon name="convert" className="h-4 w-4" />
            Convert
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Conversion failed">{error}</Note>}
      {result && !running && <ImageResult result={result} />}
    </div>
  )
}
