import { useEffect } from 'react'
import { matchesAccept } from '../lib/accept.js'

// Route files carried on the clipboard into the same pipeline as the picker and
// drag-and-drop. A screenshot lands on the clipboard as a file item, so this is
// the shortest path from "grab a screenshot" to "convert it" — no saving to
// disk and re-picking. Purely local: the File already exists in the page,
// nothing is read or sent anywhere.
//
// `accept` applies the filter the native picker would have applied, since the
// clipboard offers no such guarantee. The paste is only claimed
// (preventDefault) when a file actually matches, so pasting text into a field,
// or pasting a screenshot into a PDF-only tool, behaves exactly as before.
export function usePasteFiles(onFiles, accept) {
  useEffect(() => {
    const onPaste = (event) => {
      const files = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((file) => file && matchesAccept(file, accept))
      if (!files.length) return
      event.preventDefault()
      onFiles(files)
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onFiles, accept])
}
