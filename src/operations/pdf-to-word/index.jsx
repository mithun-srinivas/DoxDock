import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { pdfToWord } from './helpers.js'

export default function PdfToWord() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset, slow, cancel } = useJob()

  const pick = (files) => {
    setFile(files[0])
    reset()
  }
  const go = () => run((p) => pdfToWord(file, p).then((blob) => ({ blob, filename: `${baseName(file.name)}.docx` })))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" icon="fileText" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="fileOut" className="h-4 w-4" />
              Convert to Word
            </button>
            {running && slow && (
              <button type="button" onClick={cancel}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500 bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 hover:border-red-600 transition-colors">
                <Icon name="x" className="h-4 w-4" />
                Cancel
              </button>
            )}
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Conversion failed">{error}</Note>}
    </div>
  )
}
