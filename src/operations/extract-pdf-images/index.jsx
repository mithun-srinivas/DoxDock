import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { extractPdfImages } from './helpers.js'
import { usePdfPageCount } from '../../hooks/usePdfPageCount.js'

export default function ExtractPdfImages() {
  const [file, setFile] = useState(null)
  const { running, progress, error, result, run, reset } = useJob()
  const { pageCount } = usePdfPageCount(file)

  const pick = (files) => {
    setFile(files[0])
    reset()
  }

  const extract = () =>
    run((onProgress) => extractPdfImages(file, onProgress))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" hint="Images embedded in the PDF will be extracted" icon="fileText" />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}{pageCount != null && ` · ${pageCount} page${pageCount === 1 ? '' : 's'}`}</span>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="btn-primary" onClick={extract} disabled={running}>
              <Icon name="image" className="h-4 w-4" />
              Extract images
            </button>
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Couldn't extract images">{error}</Note>}
      {result && !running && result.images.length === 0 && (
        <Note type="warning" title="No images found">
          This PDF doesn't appear to contain embedded images. Try "PDF to Images" for full-page renders instead.
        </Note>
      )}
      {result && !running && result.images.length > 0 && (
        <>
          <Note type="info">
            Found {result.images.length} embedded image{result.images.length === 1 ? '' : 's'}.
            {result.skipped.count > 0 && ` ${result.skipped.count} more use an encoding this tool can't export yet (${[...result.skipped.formats].join(', ')}).`}
          </Note>
          <ResultGallery results={result.images} zipName={`${file?.name?.replace(/\.pdf$/i, '') || 'pdf'}-images.zip`} />
        </>
      )}
    </div>
  )
}
