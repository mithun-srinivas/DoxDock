import { useState } from 'react'
import Icon from './Icon.jsx'
import { cx } from '../lib/format.js'
import { groupedOperations, searchOperations } from '../registry/registry.js'

export default function Sidebar({ activeId, onSelect, onOpenPalette }) {
  const [query, setQuery] = useState('')
  const results = searchOperations(query)
  const groups = groupedOperations(results)

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
        >
          <Icon name="search" className="h-4 w-4" />
          <span>Search tools…</span>
          <kbd className="ml-auto hidden rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-600 sm:inline">
            ⌘K
          </kbd>
        </button>
        <label className="sr-only" htmlFor="sidebar-filter">
          Filter tools
        </label>
        <input
          id="sidebar-filter"
          type="search"
          placeholder="Filter…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field-input mt-2"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Operations">
        {!query && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-current={activeId == null ? 'page' : undefined}
            className={cx(
              'mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              activeId == null
                ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <Icon
              name="home"
              className={cx(
                'h-4 w-4 flex-shrink-0',
                activeId == null
                  ? 'text-brand-600 dark:text-brand-300'
                  : 'text-slate-400',
              )}
            />
            <span>Home</span>
          </button>
        )}
        {groups.length === 0 && (
          <p className="px-3 py-4 text-sm text-slate-500">
            No tools match “{query}”.
          </p>
        )}
        {groups.map((group, gi) => (
          <div
            key={group.id}
            className={cx(
              'mb-2',
              gi > 0 &&
                'mt-4 border-t border-slate-200/80 pt-4 dark:border-slate-800',
            )}
          >
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.ops.map((op) => (
                <li key={op.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(op.id)}
                    aria-current={activeId === op.id ? 'page' : undefined}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      activeId === op.id
                        ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                    )}
                  >
                    <Icon
                      name={op.icon}
                      className={cx(
                        'h-4 w-4 flex-shrink-0',
                        activeId === op.id
                          ? 'text-brand-600 dark:text-brand-300'
                          : 'text-slate-400',
                      )}
                    />
                    <span className="truncate">{op.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}
