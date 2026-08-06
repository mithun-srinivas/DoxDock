import { useRef, useState, useCallback, useId } from 'react'
import Icon from './Icon.jsx'
import Note from './Note.jsx'
import { cx, formatBytes } from '../lib/format.js'
import { useFileDrop } from '../hooks/useFileDrop.js'

// Past this, a browser-side job is slow enough (and memory-hungry enough) to be
// worth a heads-up before the user waits on it. Advisory only — nothing here
// blocks or rejects a file.
const LARGE_FILE_BYTES = 100 * 1024 * 1024 // ~100 MB

const asArray = (value) =>
  value == null ? [] : Array.isArray(value) ? value : [value]

// Reusable drag-and-drop dropzone + file picker. Keyboard accessible (Enter/Space
// opens the picker). Files never leave the browser — they are handed straight to
// the calling operation.
//
// `files` is optional: pass the operation's own selection when it can be cleared
// or items removed, so the large-file heads-up tracks it exactly. Left out, the
// heads-up reflects the most recent pick, which is right for the single-file
// tools that simply replace their selection.
export default function Dropzone({
  onFiles,
  files,
  accept,
  multiple = true,
  label = 'Drop files here or click to browse',
  hint,
  className,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [picked, setPicked] = useState([])
  const id = useId()

  const selected = files === undefined ? picked : asArray(files)
  const oversized = selected.filter((f) => f && f.size > LARGE_FILE_BYTES)

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length) return
      const chosen = multiple ? files : [files[0]]
      setPicked(chosen)
      onFiles(chosen)
    },
    [onFiles, multiple],
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const open = () => inputRef.current?.click()

  // Route window-wide drops (anywhere outside this box) into the same file pipeline.
  const onWindowFileDrop = useCallback(
    (file) => handleFiles([file]),
    [handleFiles],
  )
  useFileDrop(onWindowFileDrop)

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            open()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
          dragging
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
          className,
        )}
      >
        <span
          className={cx(
            'flex h-12 w-12 items-center justify-center rounded-full',
            dragging
              ? 'bg-brand-100 text-brand-600 dark:bg-brand-800 dark:text-brand-200'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
          )}
        >
          <Icon name="upload" className="h-6 w-6" />
        </span>
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {label}
          </p>
          {hint && (
            <p
              id={`${id}-hint`}
              className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            >
              {hint}
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = '' // allow re-selecting the same file
          }}
        />
      </div>
      {oversized.length > 0 && (
        <Note
          type="warning"
          title="Large file — this may take a while"
          className="mt-3"
        >
          {oversized.length === 1 ? (
            <>
              <span className="font-medium">{oversized[0].name}</span> is{' '}
              {formatBytes(oversized[0].size)}.
            </>
          ) : (
            <>
              {oversized.length} of the selected files are over{' '}
              {formatBytes(LARGE_FILE_BYTES)}.
            </>
          )}{' '}
          Everything still runs locally in this tab, so expect a slower job and
          higher memory use — and keep the tab open until it finishes. You can
          carry on regardless.
        </Note>
      )}
    </>
  )
}
