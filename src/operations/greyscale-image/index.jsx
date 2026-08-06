import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { convertImagetoGreyscale } from './helper.js'

export default function ConvertImagetoGreyscale() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => convertImagetoGreyscale(file, p))

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="image/*"
        multiple={false}
        label="Drop an image here or click to browse"
        icon="image"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {file.name}
            </span>
            <span className="text-xs text-slate-400">
              {formatBytes(file.size)}
            </span>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={go}
            disabled={running}
          >
            <Icon name="contrast" className="h-4 w-4" />
            Convert colors to Greyscale
          </button>
        </>
      )}

      {running && progress && (
        <Progress value={progress.value} message={progress.message} />
      )}
      {error && (
        <Note type="error" title="Conversion failed">
          {error}
        </Note>
      )}
      {result && !running && <ImageResult result={result} />}
    </div>
  )
}
