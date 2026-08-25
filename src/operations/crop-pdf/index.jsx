import { useState, useRef, useEffect, useCallback } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes, baseName } from '../../lib/format.js'
import { openForCrop, renderPage, cropPdf } from './helpers.js'

export default function CropPdf() {
  const [file, setFile] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [pageDims, setPageDims] = useState(null)
  const [applyAll, setApplyAll] = useState(false)
  const [cropRect, setCropRect] = useState(null)
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const canvasRef = useRef(null)
  const overlayRef = useRef(null)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = useCallback(async (files) => {
    const f = files[0]
    setFile(f)
    setPdfDoc(null)
    setCropRect(null)
    setPageIndex(0)
    reset()
    try {
      const buf = await f.arrayBuffer()
      const doc = await openForCrop(buf)
      setPdfDoc(doc)
      setPageCount(doc.numPages)
    } catch (err) {
      setPdfDoc(null)
    }
  }, [reset])

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    const w = canvasRef.current.parentElement?.clientWidth || 600
    renderPage(pdfDoc, pageIndex + 1, canvasRef.current, Math.min(w, 700)).then((d) => {
      setPageDims(d)
      setCropRect(null)
    })
  }, [pdfDoc, pageIndex])

  const toCanvasCoords = (e) => {
    if (!overlayRef.current) return { cx: 0, cy: 0 }
    const rect = overlayRef.current.getBoundingClientRect()
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top }
  }

  const onMouseDown = (e) => {
    const { cx, cy } = toCanvasCoords(e)
    setDrawStart({ cx, cy })
    setCropRect(null)
    setDrawing(true)
  }

  const onMouseMove = (e) => {
    if (!drawing || !drawStart) return
    const { cx, cy } = toCanvasCoords(e)
    const x = Math.min(drawStart.cx, cx)
    const y = Math.min(drawStart.cy, cy)
    const w = Math.abs(cx - drawStart.cx)
    const h = Math.abs(cy - drawStart.cy)
    setCropRect({ x, y, w, h })
  }

  const onMouseUp = () => {
    setDrawing(false)
    setDrawStart(null)
  }

  const go = () => {
    if (!cropRect || !pageDims || !file) return
    run((p) =>
      cropPdf(file, {
        x: cropRect.x,
        y: cropRect.y,
        w: cropRect.w,
        h: cropRect.h,
        pageWidth: pageDims.widthPt,
        pageHeight: pageDims.heightPt,
        canvasWidth: canvasRef.current?.width || 1,
        canvasHeight: canvasRef.current?.height || 1,
        pageIndex,
        applyAll,
      }, p).then((blob) => ({ blob, filename: `${baseName(file.name)}-cropped.pdf` })),
    )
  }

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" icon="scissors" />

      {file && pdfDoc && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)} · {pageCount} pages</span>
          </div>

          {pageCount > 1 && (
            <div className="card p-4">
              <label className="space-y-1">
                <span className="field-label">Page: {pageIndex + 1} / {pageCount}</span>
                <input type="range" min="0" max={pageCount - 1} value={pageIndex} onChange={(e) => setPageIndex(Number(e.target.value))} className="w-full accent-brand-600" />
              </label>
            </div>
          )}

          <div className="card p-4">
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
              Draw a rectangle on the page to define the crop area. The crop region will be visible; everything outside it is trimmed.
            </p>
            <div className="relative inline-block border border-slate-200 dark:border-slate-700">
              <canvas ref={canvasRef} />
              <div
                ref={overlayRef}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              >
                {cropRect && (
                  <div
                    className="border-2 border-brand-500 bg-brand-500/10"
                    style={{
                      position: 'absolute',
                      left: cropRect.x,
                      top: cropRect.y,
                      width: cropRect.w,
                      height: cropRect.h,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="accent-brand-600" />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                Apply crop to all {pageCount} pages
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={go} disabled={running || !cropRect}>
              <Icon name="scissors" className="h-4 w-4" />
              Crop PDF
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Crop failed">{error}</Note>}
    </div>
  )
}
