import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'
import { extractPalette } from './helpers.js'

const MIN_COLORS = 3
const MAX_COLORS = 12

export default function PaletteExtractor() {
  const [file, setFile] = useState(null)
  const [count, setCount] = useState(6)
  const [copied, setCopied] = useState(null)

  const {
    running,
    progress,
    error,
    result,
    run,
    reset,
  } = useJob()

  const pick = (files) => {
    setFile(files[0] || null)
    setCopied(null)
    reset()
  }

  const go = () => {
    if (!file) return

    setCopied(null)

    run((onProgress) =>
      extractPalette(
        file,
        { count: Number(count) },
        onProgress,
      ),
    )
  }

  const copyColor = async (color) => {
    try {
      await navigator.clipboard.writeText(color.hex)
      setCopied(color.hex)

      setTimeout(() => {
        setCopied(null)
      }, 2000)
    } catch {
      setCopied(null)
    }
  }

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

          <div className="card p-4">
            <label className="block space-y-1">
              <span className="field-label">
                Number of colors: {count}
              </span>

              <input
                type="range"
                min={MIN_COLORS}
                max={MAX_COLORS}
                step="1"
                value={count}
                onChange={(e) => {
                  setCount(Number(e.target.value))
                  setCopied(null)
                  reset()
                }}
                className="w-full accent-brand-600"
              />
            </label>

            <p className="mt-2 text-xs text-slate-400">
              Choose between {MIN_COLORS} and {MAX_COLORS} dominant
              colors.
            </p>
          </div>

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
            {running
              ? 'Extracting colors...'
              : 'Extract palette'}
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
          title="Palette extraction failed"
        >
          {error}
        </Note>
      )}

      {result && !running && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold">
              Dominant colors
            </h2>
            <p className="text-xs text-slate-400">
              Click Copy to copy a HEX color value.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.map((color) => (
              <div
                key={color.hex}
                className="card overflow-hidden"
              >
                <div
                  className="h-24 w-full"
                  style={{
                    backgroundColor: color.hex,
                  }}
                  aria-label={`Color ${color.hex}`}
                />

                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {color.hex}
                    </p>
                    <p className="text-xs text-slate-400">
                      {color.rgb}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => copyColor(color)}
                  >
                    <Icon
                      name="copy"
                      className="h-4 w-4"
                    />
                    {copied === color.hex ? 'Copied!' : 'Copy HEX'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
