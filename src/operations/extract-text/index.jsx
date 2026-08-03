import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { downloadText } from '../../lib/download.js'
import { extractText } from './helpers.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'

export default function ExtractText() {
  const [file, setFile] = useState(null)
  const [format, setFormat] = useState('text')
  const [copied, setCopied] = useState(false)
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)
  const wordCount = result?.text?.trim() ? result.text.trim().split(/\s+/).length : 0
  const charCount = result?.text?.length ?? 0

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => extractText(file, { format }, p))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard may be blocked */
    }
  }

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

          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1">
              <span className="field-label">Output</span>
              <select className="field-input" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="text">Plain text (.txt)</option>
                <option value="markdown">Markdown (.md)</option>
              </select>
            </label>
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="fileText" className="h-4 w-4" />
              Extract text
            </button>
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn’t extract text">{error}</Note>}

      {result && !running && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={copy}>
              <Icon name={copied ? 'check' : 'fileText'} className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                downloadText(result.text, `${baseName(file.name)}.${format === 'markdown' ? 'md' : 'txt'}`, format === 'markdown' ? 'text/markdown' : 'text/plain')
              }
            >
              <Icon name="download" className="h-4 w-4" />
              Download
            </button>
            <span className="text-xs text-slate-400">
            {result.pageCount} page(s) · {wordCount} words · {charCount} characters
            </span> 
          </div>
          <textarea readOnly value={result.text} className="field-input h-80 font-mono text-xs leading-relaxed" spellCheck={false} />
        </div>
      )}
    </div>
  )
}
