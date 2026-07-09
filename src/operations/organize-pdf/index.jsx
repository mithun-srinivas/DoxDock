import { useState, useEffect } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import { useJob } from '../../hooks/useJob.js'
import { baseName } from '../../lib/format.js'
import { renderThumbnails, buildFromOrder } from './helpers.js'

export default function OrganizePdf() {
  const [file, setFile] = useState(null)
  const [thumbs, setThumbs] = useState([]) // full set, keyed by original index
  const [items, setItems] = useState([]) // current arrangement: array of original indices
  const [dragIndex, setDragIndex] = useState(null)
  const thumbJob = useJob()
  const buildJob = useJob()

  useEffect(() => () => thumbs.forEach((t) => URL.revokeObjectURL(t.url)), [thumbs])

  const pick = async (files) => {
    const f = files[0]
    setFile(f)
    setThumbs([])
    setItems([])
    buildJob.reset()
    const result = await thumbJob.run((p) => renderThumbnails(f, p))
    if (result) {
      setThumbs(result)
      setItems(result.map((t) => t.index))
    }
  }

  const thumbFor = (idx) => thumbs.find((t) => t.index === idx)
  const move = (from, to) =>
    setItems((prev) => {
      const next = [...prev]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  const remove = (pos) => setItems((prev) => prev.filter((_, i) => i !== pos))

  const build = () =>
    buildJob.run((p) => buildFromOrder(file, items, p).then((blob) => ({ blob, filename: `${baseName(file.name)}-organized.pdf` })))

  return (
    <div className="space-y-6">
      <Dropzone onFiles={pick} accept="application/pdf,.pdf" multiple={false} label="Drop a PDF here or click to browse" icon="fileText" />

      {thumbJob.running && thumbJob.progress && <Progress value={thumbJob.progress.value} message={thumbJob.progress.message} />}
      {thumbJob.error && <Note type="error" title="Couldn’t open this PDF">{thumbJob.error}</Note>}

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {items.length} of {thumbs.length} pages kept — drag to reorder, click ✕ to delete.
            </p>
            <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setItems(thumbs.map((t) => t.index))}>
              Reset
            </button>
          </div>

          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {items.map((origIdx, pos) => {
              const t = thumbFor(origIdx)
              return (
                <li
                  key={origIdx}
                  draggable
                  onDragStart={() => setDragIndex(pos)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragIndex != null && dragIndex !== pos) move(dragIndex, pos)
                    setDragIndex(null)
                  }}
                  className="group relative cursor-grab overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <img src={t?.url} alt={`Page ${origIdx + 1}`} className="w-full" />
                  <span className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {origIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(pos)}
                    aria-label={`Delete page ${origIdx + 1}`}
                    className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  >
                    <Icon name="x" className="h-3 w-3" />
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" onClick={build} disabled={buildJob.running}>
              <Icon name="check" className="h-4 w-4" />
              Apply changes
            </button>
            {buildJob.result && <DownloadButton result={buildJob.result} />}
          </div>
          {buildJob.running && buildJob.progress && <Progress value={buildJob.progress.value} message={buildJob.progress.message} />}
          {buildJob.error && <Note type="error" title="Couldn’t build the PDF">{buildJob.error}</Note>}
        </>
      )}
    </div>
  )
}
