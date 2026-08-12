import { useEffect, useMemo, useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import DownloadButton from '../../components/DownloadButton.jsx'
import ImageResult from '../../components/ImageResult.jsx'
import { useJob } from '../../hooks/useJob.js'
import { decode, dimsOf, IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'
import { decode, dimsOf } from '../../lib/imageCanvas.js'
import { decode, dimsOf, IMAGE_FORMATS_HINT } from '../../lib/imageCanvas.js'
import RegionPicker from './RegionPicker.jsx'
import { redactImage, STRENGTHS, DEFAULT_STRENGTH } from './helpers.js'

const MODES = [
  { key: 'pixelate', label: 'Pixelate', hint: 'Hard mosaic blocks' },
  { key: 'blur', label: 'Blur', hint: 'Soft, same detail removed' },
]

export default function RedactImage() {
  const [file, setFile] = useState(null)
  const [natural, setNatural] = useState(null)
  const [regions, setRegions] = useState([])
  const [mode, setMode] = useState('pixelate')
  const [strength, setStrength] = useState(DEFAULT_STRENGTH)
  const { running, progress, error, result, run, reset } = useJob()

  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  useEffect(() => {
    if (!file) return
    let cancelled = false
    decode(file).then((bitmap) => {
      if (!cancelled) setNatural(dimsOf(bitmap))
      bitmap.close?.()
    })
    return () => {
      cancelled = true
    }
  }, [file])

  const pick = (files) => {
    setFile(files[0])
    setNatural(null)
    setRegions([])
    reset()
  }
  const change = (next) => {
    setRegions(next)
    reset()
  }
  const choose = (setter) => (value) => {
    setter(value)
    reset()
  }
  const go = () => run((p) => redactImage(file, regions, { mode, strength }, p))

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        accept="image/*"
        multiple={false}
        label="Drop an image here or click to browse"
        hint={`${IMAGE_FORMATS_HINT} — hide faces, names or account numbers before sharing a screenshot`}
        hint="Hide faces, names or account numbers before sharing a screenshot"
        hint={`${IMAGE_FORMATS_HINT} — hide faces, names or account numbers before sharing a screenshot`}
        icon="image"
      />

      {file && natural && (
        <>
          <div className="card space-y-3 p-4">
            <span className="field-label">Drag on the image to cover something</span>
            <RegionPicker url={url} natural={natural} regions={regions} onChange={change} />
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                {regions.length === 0
                  ? 'No regions yet'
                  : `${regions.length} region(s) — drag again to add another`}
              </span>
              {regions.length > 0 && (
                <button type="button" className="btn-ghost" onClick={() => change([])}>
                  <Icon name="trash" className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <span className="field-label">Effect</span>
              {MODES.map(({ key, label, hint }) => (
                <label key={key} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="redact-mode"
                    checked={mode === key}
                    onChange={() => choose(setMode)(key)}
                    className="mt-1 accent-brand-600"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-slate-400">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="space-y-2">
              <span className="field-label">Strength</span>
              {Object.keys(STRENGTHS).map((key) => (
                <label key={key} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="redact-strength"
                    checked={strength === key}
                    onChange={() => choose(setStrength)(key)}
                    className="accent-brand-600"
                  />
                  <span className="text-sm capitalize">{key}</span>
                </label>
              ))}
              <p className="text-xs text-slate-400">
                Stronger means fewer, larger blocks — less of the original left behind.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary"
              onClick={go}
              disabled={running || regions.length === 0}
            >
              <Icon name="eraser" className="h-4 w-4" />
              Redact Image
            </button>
            {result && !running && <DownloadButton result={result} />}
          </div>

          {regions.length === 0 && (
            <Note type="info">Drag a box over anything you want hidden, then redact.</Note>
          )}
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && (
        <Note type="error" title="Couldn’t redact this image">
          {error}
        </Note>
      )}
      {result && !running && (
        <>
          <Note type="info" title="Done">
            {result.regions} region(s) {result.mode === 'blur' ? 'blurred' : 'pixelated'}. The
            hidden detail is gone from the exported pixels — it is not an overlay you can peel
            off.
          </Note>
          <ImageResult result={result} />
        </>
      )}
    </div>
  )
}
