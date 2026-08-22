import { useState, useMemo } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName, parsePageRanges } from '../../lib/format.js'
import { splitPdf } from './helpers.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'

export default function SplitPdf() {
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('explode')
  const [ranges, setRanges] = useState('')
  const [sizeMb, setSizeMb] = useState(5)
  const [everyN, setEveryN] = useState(2)
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)

  // Validate the ranges input as the user types, using the same parser the
  // job itself uses, so an invalid range is caught before "Split PDF" runs
  // instead of failing partway through the job.
  const rangeError = useMemo(() => {
    if (mode !== 'ranges' || !ranges.trim() || pageCount == null) return null
    const groups = ranges.split(',').map((s) => s.trim()).filter(Boolean)
    for (const g of groups) {
      try {
        const pages = parsePageRanges(g, pageCount)
        if (!pages.length) return `"${g}" has no valid pages (document has ${pageCount}).`
      } catch (err) {
        return err.message
      }
    }
    return null
  }, [mode, ranges, pageCount])

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => splitPdf(file, { mode, ranges, sizeMb, everyN }, p))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" icon="fileText" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
           <span className="text-xs text-slate-400">{formatBytes(file.size)}{pageCount != null && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}</span>
          </div>

          <div className="card space-y-4 p-4">
            <fieldset className="space-y-2">
              <legend className="field-label mb-1">Mode</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === 'explode'} onChange={() => setMode('explode')} />
                Explode — one PDF per page
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === 'ranges'} onChange={() => setMode('ranges')} />
                Page ranges — one PDF per range
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === 'size'} onChange={() => setMode('size')} />
                By size — pack pages so each PDF stays under a target
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === 'everyN'} onChange={() => setMode('everyN')} />
                Every N pages — fixed-size chunks
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="mode" checked={mode === 'bookmarks'} onChange={() => setMode('bookmarks')} />
                By bookmarks — one PDF per top-level bookmark (chapter)
              </label>
            </fieldset>
            {mode === 'everyN' && (
              <label className="block space-y-1">
                <span className="field-label">Pages per file</span>
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  step="1"
                  value={everyN}
                  onChange={(e) => setEveryN(e.target.value)}
                />
                {pageCount != null && Number(everyN) >= 1 && (
                  <span className="text-xs text-slate-500">
                    {pageCount} pages → {Math.ceil(pageCount / Number(everyN))} file{Math.ceil(pageCount / Number(everyN)) === 1 ? '' : 's'} (last one may be smaller).
                  </span>
                )}
              </label>
            )}
            {mode === 'size' && (
              <label className="block space-y-1">
                <span className="field-label">Target size per file (MB)</span>
                <input
                  className="field-input"
                  type="number"
                  min="0.05"
                  step="0.5"
                  value={sizeMb}
                  onChange={(e) => setSizeMb(e.target.value)}
                />
                <span className="text-xs text-slate-500">Best-effort: a single page larger than the target becomes its own file (marked <code>-oversize</code>).</span>
              </label>
            )}
            {mode === 'bookmarks' && (
              <p className="text-xs text-slate-500">Splits at each top-level bookmark. A PDF with no bookmarks reports a clear message.</p>
            )}
            {mode === 'ranges' && (
              <label className="block space-y-1">
                <span className="field-label">Ranges (comma-separated groups)</span>
                <input
                  className="field-input"
                  placeholder="e.g. 1-3, 4-6, 7"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  aria-invalid={!!rangeError}
                />
                <span className="text-xs text-slate-500">Each group becomes a separate output file.</span>
                {rangeError && <span className="block text-xs text-red-600 dark:text-red-400">{rangeError}</span>}
              </label>
            )}
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={go}
            disabled={running || (mode === 'ranges' && (!ranges.trim() || !!rangeError)) || (mode === 'size' && !(Number(sizeMb) > 0))}
          >
            <Icon name="scissors" className="h-4 w-4" />
            Split PDF
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Split failed">{error}</Note>}
      {result && !running && <ResultGallery results={result} preview={false} zipName={`${baseName(file?.name || 'split')}-split.zip`} />}
    </div>
  )
}
