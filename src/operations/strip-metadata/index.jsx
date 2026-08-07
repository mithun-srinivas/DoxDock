import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { stripMetadata } from './helpers.js'
import { IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'

export default function StripMetadata() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => stripMetadata(file, {}, p))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="image/*" multiple={false} label="Drop an image here or click to browse" hint={`${IMAGE_FORMATS_HINT} — JPEGs often carry GPS location and camera EXIF data`} icon="image" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>
          <button type="button" className="btn-primary" onClick={go} disabled={running}>
            <Icon name="lock" className="h-4 w-4" />
            Strip metadata
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn’t process this image">{error}</Note>}
      {result && !running && (
        <>
          <Note type="info">Done — the new file contains no EXIF, GPS, or camera metadata.</Note>
          <ImageResult result={result} />
        </>
      )}
    </div>
  )
}
