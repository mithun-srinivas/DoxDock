import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'
import { splitImage } from './helpers.js'

export default function SplitImage() {
  const [file, setFile] = useState(null)
  const [rows, setRows] = useState(2)
  const [columns, setColumns] = useState(2)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0] || null)
    reset()
  }

  const go = () => {
    if (!file) return

    run((onProgress) =>
      splitImage(
        file,
        {
          rows: Number(rows),
          columns: Number(columns),
        },
        onProgress,
      ),
    )
  }

  const totalTiles = Number(rows) * Number(columns)

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        files={file ? [file] : []}
        accept="image/*"
        multiple={false}
        label="Drop an image here or click to browse"
        hint={IMAGE_FORMATS_HINT}
        icon="image"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="image" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {file.name}
            </span>
          </div>

          <div className="card p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Rows</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="field-input"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                />
              </label>

              <label className="space-y-1">
                <span className="field-label">Columns</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="field-input"
                  value={columns}
                  onChange={(e) => setColumns(e.target.value)}
                />
              </label>
            </div>

            <Note type="info" className="mt-4">
              This will create {totalTiles} tile{totalTiles === 1 ? '' : 's'} and
              download them together as a ZIP.
            </Note>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={go}
            disabled={running}
          >
            <Icon name="grid" className="h-4 w-4" />
            {running ? 'Splitting image...' : 'Split image'}
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
        <Note type="error" title="Image split failed">
          {error}
        </Note>
      )}

      {result && !running && (
        <ResultGallery
          results={result}
          zipName="split-image.zip"
        />
      )}
    </div>
  )
}
