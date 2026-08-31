import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { powerpointToPdf } from './helpers.js'

export default function PowerpointToPdf() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0] || null)
    reset()
  }

  const go = () =>
    run((onProgress) =>
      powerpointToPdf(file, onProgress).then((blob) => ({
        blob,
        filename: `${baseName(file.name)}.pdf`,
      })),
    )

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        multiple={false}
        label="Drop a .pptx file here or click to browse"
        hint="PowerPoint Presentation"
        icon="fileText"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running}>
              <Icon name="fileText" className="h-4 w-4" />
              {running ? 'Converting...' : 'Convert to PDF'}
            </button>

            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}

      {error && (
        <Note type="error" title="Conversion failed">
          {error}
        </Note>
      )}
    </div>
  )
}
