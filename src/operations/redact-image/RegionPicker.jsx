import { useRef, useState } from 'react'
import Icon from '../../components/Icon.jsx'

// Drag on the image to add a redaction box. Boxes are stored in the image's
// natural pixel coordinates and rendered as percentages, so they stay correct
// at any display size — the same convention Cropper.jsx uses.
const MIN = 8

export default function RegionPicker({ url, natural, regions, onChange }) {
  const imgRef = useRef(null)
  const drag = useRef(null)
  const [draft, setDraft] = useState(null)

  const toNatural = (e) => {
    const rect = imgRef.current.getBoundingClientRect()
    const scale = natural.width / rect.width
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale,
    }
  }

  const boxFrom = (a, b) => ({
    x: Math.max(0, Math.min(a.x, b.x)),
    y: Math.max(0, Math.min(a.y, b.y)),
    w: Math.min(Math.abs(b.x - a.x), natural.width),
    h: Math.min(Math.abs(b.y - a.y), natural.height),
  })

  const onDown = (e) => {
    e.preventDefault()
    const start = toNatural(e)
    drag.current = start
    setDraft({ ...start, w: 0, h: 0 })
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const onMove = (e) => {
    if (!drag.current) return
    setDraft(boxFrom(drag.current, toNatural(e)))
  }
  const onUp = (e) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    const start = drag.current
    drag.current = null
    setDraft(null)
    if (!start) return
    const box = boxFrom(start, toNatural(e))
    // A click rather than a drag: ignore it instead of adding a dot.
    if (box.w < MIN || box.h < MIN) return
    onChange([...regions, round(box)])
  }

  const remove = (index) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    onChange(regions.filter((_, i) => i !== index))
  }

  const pct = (v, total) => `${(v / total) * 100}%`
  const style = (r) => ({
    left: pct(r.x, natural.width),
    top: pct(r.y, natural.height),
    width: pct(r.w, natural.width),
    height: pct(r.h, natural.height),
  })

  return (
    <div className="relative inline-block max-w-full touch-none select-none">
      <img
        ref={imgRef}
        src={url}
        alt="Redaction source"
        onPointerDown={onDown}
        className="block max-h-[28rem] max-w-full cursor-crosshair"
        draggable={false}
      />

      {regions.map((r, i) => (
        <div
          key={`${r.x}-${r.y}-${r.w}-${r.h}-${i}`}
          className="absolute border-2 border-brand-500 bg-brand-500/30"
          style={style(r)}
        >
          <button
            type="button"
            onPointerDown={remove(i)}
            title={`Remove region ${i + 1}`}
            className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full border border-slate-400 bg-white text-slate-600 shadow"
          >
            <Icon name="x" className="h-3 w-3" />
          </button>
        </div>
      ))}

      {draft && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-brand-400 bg-brand-400/20"
          style={style(draft)}
        />
      )}
    </div>
  )
}

function round(r) {
  return {
    x: Math.round(r.x),
    y: Math.round(r.y),
    w: Math.round(r.w),
    h: Math.round(r.h),
  }
}
