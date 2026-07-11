import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import FileList from '../../components/FileList.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { mergePdfs } from './helpers.js'

export default function MergePdfs() {
  const [files, setFiles] = useState([])
  const { running, progress, error, setError, result, run, reset } = useJob();

  const add = (incoming) => {
    const newFiles = incoming.filter((f) =>
      !files.some((existing) => existing.name === f.name && existing.size === f.size)
    );
    if (newFiles.length === 0 && incoming.length > 0) {
      setError("All selected files are duplicates.");
      return;
    }
    setFiles((prev) => [
      ...prev,
      ...newFiles.filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)),
    ]);
    reset();
  };
  const move = (from, to) =>
    setFiles((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })

  const merge = () => run((p) => mergePdfs(files, p).then((blob) => ({ blob, filename: 'merged.pdf' })))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={add} accept="application/pdf,.pdf" label="Drop PDFs here or click to browse" hint="Add two or more PDFs, then drag to reorder" icon="fileText" />

      {files.length > 0 && (
        <>
          <FileList files={files} onMove={move} onRemove={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))} onClear={() => { setFiles([]); reset() }} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={merge} disabled={running || files.length < 2}>
              <Icon name="layers" className="h-4 w-4" />
              Merge {files.length > 1 ? `${files.length} PDFs` : 'PDFs'}
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Merge failed">{error}</Note>}
    </div>
  )
}
