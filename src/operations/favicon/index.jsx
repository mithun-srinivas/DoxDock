import { useState } from 'react'

import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'

import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'

import { generateFavicons } from './helpers.js'

export default function FaviconGenerator() {
  const [file, setFile] = useState(null)

  const {
    running,
    progress,
    error,
    result,
    run,
    reset,
  } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }

  const go = () => {
    run((onProgress) => generateFavicons(file, onProgress))
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="image/*"
        multiple={false}
        label="Drop an image here or click to browse"
        hint="JPEG, PNG, WebP, or AVIF"
        icon="image"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon
              name="image"
              className="h-5 w-5 text-brand-600"
            />

            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {file.name}
            </span>

            <span className="text-xs text-slate-400">
              {formatBytes(file.size)}
            </span>
          </div>

          <Note type="info">
            Generates 16×16, 32×32, 48×48, 180×180, 192×192,
            and 512×512 PNG icons, plus a multi-size favicon.ico.
          </Note>

          <button
            type="button"
            className="btn-primary"
            onClick={go}
            disabled={running}
          >
            <Icon
              name="image"
              className="h-4 w-4"
            />
            Generate Icons
          </button>
        </>
      )}

      {running && progress && (
        <Progress
          value={progress.value}
          message={progress.message}
        />
      )}

      {error && (
        <Note
          type="error"
          title="Icon generation failed"
        >
          {error}
        </Note>
      )}

      {result && !running && (
        <ResultGallery
          results={result}
          zipName="favicon-icons.zip"
          preview
        />
      )}
    </div>
  )
}