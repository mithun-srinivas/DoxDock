import { Suspense, useEffect, useState, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import PrivacyBadge from './components/PrivacyBadge.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Note from './components/Note.jsx'
import Icon from './components/Icon.jsx'
import Progress from './components/Progress.jsx'
import Home from './components/Home.jsx'
import OSCodeNavBadge from './components/OSCodeNavBadge.jsx'
import { useTheme } from './hooks/useTheme.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'
import { useDocumentTitle } from './hooks/useDocumentTitle.js'
import { getOperation } from './registry/registry.js'

// Hash routing. An empty hash (or #/ or #/home) means the Home landing page
// (activeId === null); #/<id> opens that tool.
function useHashSelection() {
  const parse = () => {
    const raw = window.location.hash.replace(/^#\/?/, '')
    if (!raw || raw === 'home') return null
    return getOperation(raw) ? raw : null
  }
  const [activeId, setActiveId] = useState(parse)

  const select = useCallback((id) => {
    setActiveId(id)
    const target = id ? `#/${id}` : '#/'
    if (window.location.hash !== target) window.location.hash = target
  }, [])

  useEffect(() => {
    const onHash = () => setActiveId(parse())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return [activeId, select]
}

export default function App() {
  const [theme, setTheme] = useTheme()
  const [activeId, select] = useHashSelection()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useLocalStorage('doxdock:sidebarCollapsed', false)

  const activeOp = activeId ? getOperation(activeId) : null

  useDocumentTitle(activeOp ? `${activeOp.name} — DoxDock` : 'DoxDock')

  // Global Cmd/Ctrl+K to open the palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleSelect = (id) => {
    select(id)
    setMobileNavOpen(false)
  }

  const Component = activeOp?.Component

  // Standalone "pop-out" mode: render only the active tool, no sidebar/palette.
  const standalone = new URLSearchParams(window.location.search).get('standalone') === '1'
  if (standalone && activeOp) {
    return (
      <div className="flex h-full flex-col">
        <header className="z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name={activeOp.icon} className="h-5 w-5" />
          </span>
          <span className="font-semibold tracking-tight">{activeOp.name}</span>
          <span className="ml-1 hidden sm:block"><PrivacyBadge compact /></span>
          <div className="ml-auto">
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
            <Suspense fallback={<Progress message="Loading tool…" />}>
              {Component && <Component key={activeOp.id} />}
            </Suspense>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <button
          type="button"
          className="btn-ghost -ml-2 px-2 lg:hidden"
          aria-label="Toggle navigation"
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          <Icon name={mobileNavOpen ? 'x' : 'grid'} className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="btn-ghost -ml-2 hidden px-2 lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
        >
          <Icon name="panelLeft" className="h-5 w-5" />
        </button>
        <a href="#/" className="flex items-center gap-2" onClick={() => handleSelect(null)}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="layers" className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">DoxDock</span>
        </a>
        <div className="ml-2 hidden md:block">
          <PrivacyBadge />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <OSCodeNavBadge />
          <a
            href="ideology.html"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost gap-1.5 px-2.5"
            title="Why DoxDock exists — a letter to our users"
          >
            <Icon name="shieldCheck" className="h-4 w-4 text-brand-500" />
            <span className="hidden sm:inline">Ideology</span>
          </a>
          <a
            href="https://github.com/mithun-srinivas/DoxDock"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost hidden px-2 sm:inline-flex"
            title="Open source (MIT) — view or self-host"
            aria-label="GitHub"
          >
            <Icon name="github" className="h-5 w-5" />
          </a>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar (desktop) */}
        <aside
          className={`hidden flex-shrink-0 overflow-hidden bg-slate-50 transition-[width,border] duration-200 dark:bg-slate-900/50 lg:block ${
            collapsed ? 'lg:w-0 border-r-0' : 'w-72 border-r border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="w-72">
            <Sidebar activeId={activeId} onSelect={handleSelect} onOpenPalette={() => setPaletteOpen(true)} />
          </div>
        </aside>

        {/* Sidebar (mobile drawer) */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileNavOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-72 border-r border-slate-200 bg-slate-50 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <Sidebar
                activeId={activeId}
                onSelect={handleSelect}
                onOpenPalette={() => {
                  setMobileNavOpen(false)
                  setPaletteOpen(true)
                }}
              />
            </aside>
          </div>
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className={`mx-auto px-4 py-6 sm:px-6 sm:py-8 ${activeOp ? 'max-w-3xl' : 'max-w-6xl'}`}>
            {activeOp ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                      <Icon name={activeOp.icon} className="h-6 w-6" />
                    </span>
                    <div>
                      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{activeOp.name}</h1>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{activeOp.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 md:hidden">
                    <PrivacyBadge compact />
                  </div>
                  {activeOp.notes && (
                    <div className="mt-4">
                      <Note type="warning" title="Good to know">
                        {activeOp.notes}
                      </Note>
                    </div>
                  )}
                </div>

                <Suspense fallback={<Progress message="Loading tool…" />}>
                  {Component && <Component key={activeOp.id} />}
                </Suspense>
              </>
            ) : (
              <Home onSelect={handleSelect} onOpenPalette={() => setPaletteOpen(true)} />
            )}
          </div>

          <footer className="mx-auto max-w-3xl space-y-2 px-4 pb-10 pt-4 text-xs text-slate-400 sm:px-6">
            <p>
              DoxDock processes everything on your device. No file you open is ever uploaded — the
              app makes zero network requests at runtime. Open source under the MIT license.
            </p>
            <p className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                Supported by
                <a
                  href="https://github.com/OSCode-Community"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
                >
                  <img src="/oscode.png" alt="" className="h-4 w-4 rounded-sm" />
                  OSCode Community
                </a>
              </span>
              <span className="text-slate-300 dark:text-slate-700">&bull;</span>
              <a
                href="https://github.com/mithun-srinivas/DoxDock"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
              >
                <Icon name="github" className="h-3.5 w-3.5" />
                Star us on GitHub
              </a>
            </p>
          </footer>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  )
}
