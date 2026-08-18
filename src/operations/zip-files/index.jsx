import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import FileList from '../../components/FileList.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { zipFiles } from './helpers.js'

export default function ZipFiles() {
  const [files, setFiles] = useState([])
  const { running, progress, error, result, run, reset } = useJob()

  const add = (incoming) => {
    setFiles((prev) => [...prev, ...incoming])
    reset()
  }

const create = () =>
  run((onProgress) =>
    zipFiles(files, onProgress).then((blob) => ({
      blob,
      filename: 'archive.zip',
    })),
  )

  return (
  <div className="space-y-6">
    <Dropzone
      onFiles={add}
      files={files}
      accept="*/*"
      label="Drop files here or click to browse"
      hint="Add two or more files to create a ZIP"
      icon="fileOut"
    />

    {files.length > 0 && (
      <FileList
        files={files}
        onRemove={(i) =>
          setFiles((prev) => prev.filter((_, index) => index !== i))
        }
        onClear={() => {
          setFiles([])
          reset()
        }}
      />
    )}

    {files.length > 0 && (
  <div className="flex flex-wrap items-center gap-3">
    <button
      type="button"
      className="btn-primary"
      onClick={create}
      disabled={running || files.length < 2}
    >
      <Icon name="fileOut" className="h-4 w-4" />
      Create ZIP
    </button>

    {result && <DownloadButton result={result} />}
  </div>
)}
 {running && progress && (
      <Progress
        value={progress.value}
        message={progress.message}
      />
    )}

    {error && (
      <Note type="error" title="ZIP creation failed">
        {error}
      </Note>
    )}
  </div>
)
}