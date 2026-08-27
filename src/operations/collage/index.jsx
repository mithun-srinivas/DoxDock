import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'
import { createCollage } from './helpers.js'

const LAYOUTS = [
  { value: 'grid', label: 'Grid' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
]

const MAX_SPACING = 100

export default function Collage() {
  const [files, setFiles] = useState([])
  const [layout, setLayout] = useState('grid')
  const [spacing, setSpacing] = useState(12)
  const [background, setBackground] = useState('#ffffff')

  const { running, progress, error, result, run, reset } = useJob()

    const pick = (chosen) => {
    setFiles((current) => {
      const existing = new Set(
        current.map(
          (file) => `${file.name}-${file.size}-${file.lastModified}`,
        ),
      )

      const additions = chosen.filter(
        (file) =>
          !existing.has(
            `${file.name}-${file.size}-${file.lastModified}`,
          ),
      )

      return [...current, ...additions]
    })

    reset()
  }

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index))
    reset()
  }

  const go = () => {
    if (files.length < 2) return

    run((onProgress) =>
      createCollage(
        files,
        {
          layout,
          spacing: Number(spacing),
          background,
        },
        onProgress,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        files={files}
        accept="image/*"
        multiple
        label="Drop multiple images here or click to browse"
        hint={IMAGE_FORMATS_HINT}
        icon="image"
      />

      {files.length > 0 && (
        <>
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Selected images
                </h2>
                <p className="text-xs text-slate-400">
                  {files.length} image{files.length === 1 ? '' : 's'} selected
                </p>
              </div>

              <span className="text-xs text-slate-400">
                {formatBytes(files.reduce((sum, file) => sum + file.size, 0))}
              </span>
            </div>

            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <Icon
                    name="image"
                    className="h-5 w-5 shrink-0 text-brand-600"
                  />

                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {file.name}
                  </span>

                  <span className="text-xs text-slate-400">
                    {formatBytes(file.size)}
                  </span>

                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-y-5 p-4">
            <div>
              <span className="field-label">Layout</span>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {LAYOUTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={
                      layout === option.value
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }
                    onClick={() => {
                      setLayout(option.value)
                      reset()
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-1">
              <span className="field-label">
                Spacing: {spacing}px
              </span>

              <input
                type="range"
                min="0"
                max={MAX_SPACING}
                step="1"
                value={spacing}
                onChange={(e) => {
                  setSpacing(Number(e.target.value))
                  reset()
                }}
                className="w-full accent-brand-600"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <div>
                <span className="field-label">Background color</span>
                <p className="mt-1 text-xs text-slate-400">
                  Used for the space around the images.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={background}
                  onChange={(e) => {
                    setBackground(e.target.value)
                    reset()
                  }}
                  className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                  aria-label="Choose background color"
                />

                <span className="font-mono text-xs uppercase text-slate-500">
                  {background}
                </span>
              </div>
            </label>
          </div>

          {files.length < 2 && (
            <Note type="info">
              Add at least two images to create a collage.
            </Note>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={go}
            disabled={running || files.length < 2}
          >
            <Icon
              name="image"
              className="h-4 w-4"
            />
            {running ? 'Creating collage...' : 'Create collage'}
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
          title="Collage creation failed"
        >
          {error}
        </Note>
      )}

      {result && !running && (
        <ImageResult result={result} />
      )}
    </div>
  )
}
