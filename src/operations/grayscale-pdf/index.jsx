import { useState } from "react"
import Dropzone from "../../components/Dropzone.jsx"
import Progress from "../../components/Progress.jsx"
import Note from "../../components/Note.jsx"
import DownloadButton from "../../components/DownloadButton.jsx"
import Icon from "../../components/Icon.jsx"
import { useJob } from "../../hooks/useJob.js"
import { formatBytes } from "../../lib/format.js"
import { grayscalePdf } from "./helpers.js"

export default function GrayscalePdf() {
    const [file, setFile] = useState(null)
    const { running, progress, error, result, run, reset } = useJob()

    const pick = (files) => {
        setFile(files[0])
        reset()
    }
    const go = () => run((p) => grayscalePdf(file, p))

    return (
        <div className="space-y-6">
            <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" icon="file" />

            {file && (
                <>
                    <div className="card flex items-center gap-3 p-3">
                        <Icon name="file" className="h-5 w-5 text-brand-600" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
                    </div>

                    <button type="button" className="btn-primary" onClick={go} disabled={running}>
                        <Icon name="contrast" className="h-4 w-4" />
                        Convert to Grayscale
                    </button>
                </>
            )}

            {running && progress && <Progress value={progress.value} message={progress.message} />}
            {error && <Note type="error" title="Conversion failed">{error}</Note>}
            {result && !running && (
                <>
                    <DownloadButton result={result} />
                    <Note type="info" title="Grayscale complete">
                        {result.pages} page{result.pages === 1 ? '' : 's'} converted. Text is no
                        longer selectable — pages are now grayscale images.
                    </Note>
                </>
            )}
        </div>
    )
}
