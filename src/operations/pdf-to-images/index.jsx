import { useState, useMemo } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, parsePageRanges } from '../../lib/format.js'
import { pdfToImages } from './helpers.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'

export default function PdfToImages() {
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('png')
  const [scale, setScale] = useState(2)
  const [range, setRange] = useState('')
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)

  // Range is optional here — empty means "all pages" and is valid. Only
  // validate (and only show an error) once the user has typed something.
  const rangeError = useMemo(() => {
    if (!range.trim() || pageCount == null) return null
    const groups = range.split(',').map((s) => s.trim()).filter(Boolean)
    for (const g of groups) {
      try {
        const pages = parsePageRanges(g, pageCount)
        if (!pages.length) return `"${g}" has no valid pages (document has ${pageCount}).`
      } catch (err) {
        return err.message
      }
    }
    return null
  }, [range, pageCount])

  const pick = (files) => {
    setFile(files[0])
    reset()
  }

  const convert = () =>
    run((onProgress) => pdfToImages(file, { format, scale: Number(scale), range }, onProgress))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" hint="One PDF at a time" icon="fileText" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}{pageCount != null && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}</span>
          </div>

          <div className="card p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="field-label">Format</span>
                <select className="field-input" value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="png">PNG (lossless)</option>
                  <option value="jpeg">JPEG (smaller)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="field-label">Quality / DPI</span>
                <select className="field-input" value={scale} onChange={(e) => setScale(e.target.value)}>
                  <option value={1}>Screen (72 dpi)</option>
                  <option value={2}>High (144 dpi)</option>
                  <option value={3}>Print (216 dpi)</option>
                  <option value={4}>Max (288 dpi)</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="field-label">Pages (optional)</span>
                <input
                  className="field-input"
                  placeholder="e.g. 1-3,5"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  aria-invalid={!!rangeError}
                />
                {rangeError && <span className="block text-xs text-red-600 dark:text-red-400">{rangeError}</span>}
              </label>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={convert} disabled={running || !!rangeError}>
            <Icon name="image" className="h-4 w-4" />
            Convert to images
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn’t convert this PDF">{error}</Note>}
      {result && !running && <ResultGallery results={result} zipName={`${file?.name?.replace(/\.pdf$/i, '') || 'pages'}-images.zip`} />}
    </div>
  )
}
