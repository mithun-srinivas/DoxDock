import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { stampPdf } from './helpers.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'

export default function PdfStamp() {
  const [file, setFile] = useState(null)
  const [header, setHeader] = useState('')
  const [footer, setFooter] = useState('')
  const [batesPrefix, setBatesPrefix] = useState('')
  const [batesStart, setBatesStart] = useState(1)
  const [batesPadding, setBatesPadding] = useState(4)
  const [headerPosition, setHeaderPosition] = useState('top-center')
  const [footerPosition, setFooterPosition] = useState('bottom-center')
  const [fontSize, setFontSize] = useState(10)
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () =>
    run((p) =>
      stampPdf(
        file,
        { header, footer, batesPrefix, batesStart: Number(batesStart), batesPadding: Number(batesPadding), headerPosition, footerPosition, fontSize: Number(fontSize) },
        p,
      ).then((blob) => ({ blob, filename: `${baseName(file.name)}-stamped.pdf` })),
    )

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

          <div className="card p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Header</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Header text</span>
                <input className="field-input" placeholder="e.g. Confidential — {date}" value={header} onChange={(e) => setHeader(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="field-label">Position</span>
                <select className="field-input" value={headerPosition} onChange={(e) => setHeaderPosition(e.target.value)}>
                  <option value="top-center">Top center</option>
                  <option value="top-left">Top left</option>
                  <option value="top-right">Top right</option>
                </select>
              </label>
            </div>

            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 pt-2">Footer</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="field-label">Footer text</span>
                <input className="field-input" placeholder="e.g. Page {page} of {total}" value={footer} onChange={(e) => setFooter(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="field-label">Position</span>
                <select className="field-input" value={footerPosition} onChange={(e) => setFooterPosition(e.target.value)}>
                  <option value="bottom-center">Bottom center</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-right">Bottom right</option>
                  <option value="top-center">Top center</option>
                  <option value="top-left">Top left</option>
                  <option value="top-right">Top right</option>
                </select>
              </label>
            </div>

            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 pt-2">Bates Numbering</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="space-y-1">
                <span className="field-label">Prefix</span>
                <input className="field-input" placeholder="e.g. DOC-" value={batesPrefix} onChange={(e) => setBatesPrefix(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="field-label">Start at</span>
                <input type="number" min="0" className="field-input" value={batesStart} onChange={(e) => setBatesStart(e.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="field-label">Zero-pad to</span>
                <input type="number" min="1" max="12" className="field-input" value={batesPadding} onChange={(e) => setBatesPadding(e.target.value)} />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <label className="space-y-1">
                <span className="field-label">Font size: {fontSize}pt</span>
                <input type="range" min="6" max="24" value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="w-full accent-brand-600" />
              </label>
            </div>

            <Note type="info">
              Tokens: {'{page}'} = page number, {'{total}'} = total pages, {'{date}'} = today's date (YYYY-MM-DD).
            </Note>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="hash" className="h-4 w-4" />
              Stamp PDF
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn't stamp the PDF">{error}</Note>}
    </div>
  )
}
