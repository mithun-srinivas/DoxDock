import { useState } from "react"
import Dropzone from "../../components/Dropzone.jsx"
import Progress from "../../components/Progress.jsx"
import Note from "../../components/Note.jsx"
import DownloadButton from "../../components/DownloadButton.jsx"
import Icon from "../../components/Icon.jsx"
import { useJob } from "../../hooks/useJob.js"
import { formatBytes } from "../../lib/format.js"
import { resizePdf } from "./helpers.js"

export default function ResizePdf() {
    const [file, setFile] = useState(null)
    const { running, progress, error, result, run, reset } = useJob()

    const [size, setSize] = useState("a4")
    const [customWidth, setCustomWidth] = useState("")
    const [customHeight, setCustomHeight] = useState("")
    const [mode, setMode] = useState("fit")
    const [orientation, setOrientation] = useState("portrait")

    const pick = (files) => {
        setFile(files[0])
        reset()
    }
    const go = () =>
        run((p) => resizePdf(file, { size, customWidth: Number(customWidth), customHeight: Number(customHeight), mode, orientation }, p))

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

                    <div className="card space-y-4 p-4">
                        <label className="block space-y-1">
                            <span className="field-label">Target page size</span>
                            <select className="field-input" value={size} onChange={(e) => setSize(e.target.value)}>
                                <option value="a4">A4 (595 × 842 pt)</option>
                                <option value="letter">US Letter (612 × 792 pt)</option>
                                <option value="legal">US Legal (612 × 1008 pt)</option>
                                <option value="custom">Custom…</option>
                            </select>
                        </label>

                        {size === "custom" && (
                            <div className="flex gap-3">
                                <label className="block flex-1 space-y-1">
                                    <span className="field-label">Width (pt)</span>
                                    <input className="field-input" type="number" min="1" placeholder="595" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} />
                                </label>
                                <label className="block flex-1 space-y-1">
                                    <span className="field-label">Height (pt)</span>
                                    <input className="field-input" type="number" min="1" placeholder="842" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} />
                                </label>
                            </div>
                        )}

                        <div className="flex gap-6">
                            <label className="block space-y-1 flex-1">
                                <span className="field-label">Scaling</span>
                                <select className="field-input" value={mode} onChange={(e) => setMode(e.target.value)}>
                                    <option value="fit">Scale to fit (no clipping, centered)</option>
                                    <option value="stretch">Stretch to fill (may distort)</option>
                                </select>
                            </label>
                            <label className="block space-y-1 flex-1">
                                <span className="field-label">Orientation</span>
                                <select className="field-input" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                                    <option value="portrait">Portrait</option>
                                    <option value="landscape">Landscape</option>
                                </select>
                            </label>
                        </div>

                        <button type="button" className="btn-primary w-full" onClick={go} disabled={running || (size === "custom" && (!customWidth || !customHeight))}>
                            <Icon name="resize" className="h-4 w-4" />
                            Resize PDF
                        </button>
                    </div>
                </>
            )}

            {running && progress && <Progress value={progress.value} message={progress.message} />}
            {error && <Note type="error" title="Resize failed">{error}</Note>}
            {result && !running && (
                <>
                    <DownloadButton result={result} />
                    <Note type="info" title="Resize complete">
                        {result.pages} page{result.pages === 1 ? "" : "s"} resized to{" "}
                        {Math.round(result.targetSize[0])} × {Math.round(result.targetSize[1])} pt. Pages are
                        now images — text is no longer selectable.
                    </Note>
                </>
            )}
        </div>
    )
}
