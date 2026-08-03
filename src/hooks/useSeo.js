import { useEffect } from 'react'

// Keeps the document's SEO/social tags in sync with the active tool as the user
// navigates client-side. The tags themselves already exist in index.html (and in
// the prerendered per-tool pages) — this just updates them in place so a
// JS-rendering crawler and social-share scrapers see the right title/description.
const SITE = 'https://doxdock.vercel.app'
const DEFAULT_TITLE = 'DoxDock — Private PDF & Image Tools, 100% in Your Browser'
const DEFAULT_DESC =
  'Free, open-source PDF & image tools that run 100% in your browser — merge, split, compress, convert, edit, and sign. No uploads, no sign-up, fully private and offline.'

function setAttr(selector, attr, value) {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

export function useSeo(op) {
  useEffect(() => {
    const title = op ? `${op.name} — DoxDock` : DEFAULT_TITLE
    const description = op
      ? `${op.description} Runs 100% in your browser — no uploads, no sign-up, fully private.`
      : DEFAULT_DESC
    const url = op ? `${SITE}/${op.id}` : `${SITE}/`

    document.title = title
    setAttr('meta[name="description"]', 'content', description)
    setAttr('link[rel="canonical"]', 'href', url)
    setAttr('meta[property="og:title"]', 'content', title)
    setAttr('meta[property="og:description"]', 'content', description)
    setAttr('meta[property="og:url"]', 'content', url)
    setAttr('meta[name="twitter:title"]', 'content', title)
    setAttr('meta[name="twitter:description"]', 'content', description)
  }, [op])
}
