import { useRef, useState, useCallback, useId } from 'react'
import Icon from './Icon.jsx'
import { cx } from '../lib/format.js'
import { useFileDrop } from '../hooks/useFileDrop.js'

// Reusable drag-and-drop dropzone + file picker. Keyboard accessible (Enter/Space
// opens the picker). Files never leave the browser — they are handed straight to
// the calling operation.
export default function Dropzone({
  onFiles,
  accept,
  multiple = true,
  label = 'Drop files here or click to browse',
  hint,
  className,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const id = useId()

  const handleFiles = useCallback(
    (fileList) => {
      const files = Array.from(fileList || [])
      if (files.length) onFiles(multiple ? files : [files[0]])
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
        <p className="font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {hint && (
          <p id={`${id}-hint`} className="mt-1 text-sm text-slate-500 dark:text-slate-400">
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
  )
}
