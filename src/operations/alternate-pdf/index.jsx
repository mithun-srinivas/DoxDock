import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import FileList from '../../components/FileList.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { dedupeFiles, skippedNotice } from '../../lib/dedupeFiles.js'
import { alternatePdfs } from './helpers.js'

const isPdf = (file) => /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)

export default function AlternatePdf() {
  const [files, setFiles] = useState([])
  const [notice, setNotice] = useState('')
  const [reverseSecond, setReverseSecond] = useState(false)
  const { running, progress, error, result, run, reset } = useJob()

  const add = (incoming) => {
    const pdfs = incoming.filter(isPdf)
    const { unique, skipped } = dedupeFiles(files, pdfs)
    setNotice(skippedNotice(skipped))
    if (unique.length === 0) return
    setFiles((prev) => [...prev, ...unique])
    reset()
  }

  const move = (from, to) => {
    setFiles((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    reset()
  }

  const clear = () => {
    setFiles([])
    setNotice('')
    reset()
  }

  const interleave = () =>
    run((onProgress) =>
      alternatePdfs(files, { reverseSecond }, onProgress).then((blob) => ({
        blob,
        filename: 'alternated.pdf',
      })),
    )

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={add}
        files={files}
        accept="application/pdf,.pdf"
        label="Drop PDFs here or click to browse"
        hint="Add two or more PDFs, then drag to set the order"
      />

      {files.length > 0 && (
        <>
          <FileList
            files={files}
            onMove={move}
            onRemove={(i) => {
              setFiles((prev) => prev.filter((_, idx) => idx !== i))
              reset()
            }}
            onClear={clear}
          />

          {files.length >= 2 && (
            <div className="card p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={reverseSecond}
                  onChange={(event) => {
                    setReverseSecond(event.target.checked)
                    reset()
                  }}
                  className="mt-1 accent-brand-600"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Reverse the second file</span>
                  <span className="block text-xs text-slate-400">For backs scanned last-page-first.</span>
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={interleave}
              disabled={running || files.length < 2}
            >
              <Icon name="shuffle" className="h-4 w-4" />
              Alternate {files.length > 1 ? `${files.length} PDFs` : 'PDFs'}
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {notice && <Note type="warning">{notice}</Note>}
      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && (
        <Note type="error" title="Alternate failed">
          {error}
        </Note>
      )}
    </div>
  )
}
