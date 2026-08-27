import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { downloadText } from '../../lib/download.js'
import { recognizeImages } from './helpers.js'

export default function ImageOcr() {
  const [files, setFiles] = useState([])
  const [copied, setCopied] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (chosen) => {
    setFiles((current) => {
      const existing = new Set(
        current.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      )

      const additions = chosen.filter(
        (file) =>
          !existing.has(`${file.name}-${file.size}-${file.lastModified}`),
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
    if (!files.length) return
    run((onProgress) => recognizeImages(files, onProgress))
  }

  const copy = async (index, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(index)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard may be blocked */
    }
  }

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        files={files}
        accept="image/*"
        multiple
        label="Drop images here or click to browse"
        hint="JPEG, PNG, WebP, or AVIF"
        className="text-center"
      />

      {files.length > 0 && (
        <>
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Selected images</h2>
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

          <button
            type="button"
            className="btn-primary"
            onClick={go}
            disabled={running}
          >
            <Icon name="fileText" className="h-4 w-4" />
            {running ? 'Recognizing text...' : 'Extract text'}
          </button>
        </>
      )}

      {running && progress && (
        <Progress value={progress.value} message={progress.message} />
      )}

      {error && (
        <Note type="error" title="OCR failed">
          {error}
        </Note>
      )}

      {result && !running && (
        <div className="space-y-4">
          {result.map((item, index) => (
            <div key={`${item.filename}-${index}`} className="card space-y-3 p-4">
              <div className="flex items-center gap-2">
                <Icon name="fileText" className="h-5 w-5 text-brand-600" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {item.filename}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => copy(index, item.text)}
                  disabled={!item.text}
                >
                  <Icon
                    name={copied === index ? 'check' : 'fileText'}
                    className="h-4 w-4"
                  />
                  {copied === index ? 'Copied!' : 'Copy'}
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    downloadText(
                      item.text,
                      `${baseName(item.filename)}.txt`,
                    )
                  }
                  disabled={!item.text}
                >
                  <Icon name="download" className="h-4 w-4" />
                  Download
                </button>
              </div>

              <textarea
                readOnly
                value={item.text}
                className="field-input h-64 font-mono text-xs leading-relaxed"
                spellCheck={false}
                aria-label={`Recognized text from ${item.filename}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
