import Icon from './Icon.jsx'
import { formatBytes } from '../lib/format.js'

// Displays selected files with optional reordering (drag or arrow buttons) and
// per-item removal. Purely presentational; the parent owns the file array.
export default function FileList({
  files,
  onRemove,
  onMove, // (fromIndex, toIndex) => void — enables reorder controls when provided
  onClear,
  icon = 'fileText',
}) {

  const totalFileSize = (files) => {
    const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0)
    return formatBytes(totalSize)
  }

  if (!files.length) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {files.length} file{files.length === 1 ? '' : 's'} selected
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Total: {totalFileSize(files)}
        </p>
        {onClear && (
          <button type="button" onClick={onClear} className="btn-ghost px-2 py-1 text-xs">
            Clear all
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {files.map((file, i) => (
          <li
            key={`${file.name}-${i}`}
            draggable={!!onMove}
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
            onDragOver={(e) => onMove && e.preventDefault()}
            onDrop={(e) => {
              if (!onMove) return
              e.preventDefault()
              const from = parseInt(e.dataTransfer.getData('text/plain'), 10)
              if (!Number.isNaN(from) && from !== i) onMove(from, i)
            }}
            className="card flex items-center gap-3 p-3"
          >
            {onMove && (
              <span className="cursor-grab text-slate-400" title="Drag to reorder">
                <Icon name="grip" className="h-5 w-5" />
              </span>
            )}
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
              <Icon name={icon} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {file.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(file.size)}
              </p>
            </div>
            {onMove && (
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => onMove(i, i - 1)}
                  aria-label={`Move ${file.name} up`}
                  className="rounded p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                >
                  <Icon name="arrowUp" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={i === files.length - 1}
                  onClick={() => onMove(i, i + 1)}
                  aria-label={`Move ${file.name} down`}
                  className="rounded p-0.5 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                >
                  <Icon name="arrowDown" className="h-4 w-4" />
                </button>
              </div>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${file.name}`}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
