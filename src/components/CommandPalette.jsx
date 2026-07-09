import { useState, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'
import { cx } from '../lib/format.js'
import { searchOperations } from '../registry/registry.js'

// Cmd/Ctrl+K command palette to jump between operations.
export default function CommandPalette({ open, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const results = searchOperations(query)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    // Focus reliably: the overlay/trigger can hold focus, and rAF alone
    // sometimes fires before the input is focusable. Retry across a few frames.
    let tries = 0
    const focus = () => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.select?.()
      }
      if ((!el || document.activeElement !== el) && tries++ < 5) {
        setTimeout(focus, 30)
      }
    }
    focus()
  }, [open])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  const choose = (op) => {
    if (!op) return
    onSelect(op.id)
    onClose()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-700">
          <Icon name="search" className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a tool…"
            className="w-full bg-transparent py-3.5 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:ring-0 dark:text-slate-100"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-500">No matching tools.</li>
          )}
          {results.map((op, i) => (
            <li key={op.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(op)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
                  i === active ? 'bg-brand-50 dark:bg-brand-900/30' : '',
                )}
              >
                <Icon name={op.icon} className="h-4 w-4 flex-shrink-0 text-brand-600 dark:text-brand-300" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {op.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {op.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
