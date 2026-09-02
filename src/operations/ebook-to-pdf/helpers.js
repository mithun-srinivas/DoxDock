import { unzipSync, strFromU8 } from 'fflate'
import { htmlToBlocks } from '../../lib/htmlBlocks.js'
import { renderBlocksToPdf } from '../../lib/pdfLayout.js'

function parseXml(text, label) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')

  if (doc.querySelector('parsererror')) {
    throw new Error(`Could not parse ${label}.`)
  }

  return doc
}

function normalizePath(path) {
  const parts = []

  for (const part of String(path).replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue

    if (part === '..') {
      parts.pop()
      continue
    }

    parts.push(part)
  }

  return parts.join('/')
}

function dirname(path) {
  const normalized = normalizePath(path)
  const index = normalized.lastIndexOf('/')

  return index === -1 ? '' : normalized.slice(0, index)
}

function resolvePath(basePath, relativePath) {
  return normalizePath(`${dirname(basePath)}/${relativePath}`)
}

function getZipText(entries, path, label = path) {
  const bytes = entries[normalizePath(path)]

  if (!bytes) {
    throw new Error(`EPUB is missing ${label}.`)
  }

  return strFromU8(bytes)
}

function cleanHtmlDocument(doc) {
  doc
    .querySelectorAll('script, style, noscript, template, title, link, meta')
    .forEach((element) => element.remove())

  /*
   * The shared HTML parser turns <br> into a literal newline.
   * Replace it before handing content to the PDF renderer.
   */
  doc.querySelectorAll('br').forEach((br) => br.replaceWith(' '))

  /*
   * These elements generally contain navigation or web-only
   * content rather than ebook body content.
   */
  doc
    .querySelectorAll('nav, aside, footer, form, iframe, object, embed')
    .forEach((element) => element.remove())

  /*
   * Standard pdf-lib fonts cannot encode literal newline
   * characters. Normalize preformatted content as well.
   */
  doc.querySelectorAll('pre').forEach((pre) => {
    pre.textContent = pre.textContent.replace(/\s+/g, ' ').trim()
  })

  return doc
}

function normalizeHtmlForPdf(html) {
  /*
   * Remove literal line breaks from serialized HTML before
   * htmlToBlocks() sees it. This prevents newline characters
   * from reaching pdf-lib's WinAnsi standard fonts.
   */
  return String(html).replace(/\r\n?/g, ' ').replace(/\n/g, ' ')
}

function findPackagePath(entries) {
  const containerPath = 'META-INF/container.xml'

  const containerXml = getZipText(entries, containerPath, containerPath)

  const doc = parseXml(containerXml, 'the EPUB container')

  const rootfile = doc.querySelector('rootfile[full-path]')

  const packagePath = rootfile?.getAttribute('full-path')

  if (!packagePath) {
    throw new Error('The EPUB container does not identify a package document.')
  }

  return normalizePath(packagePath)
}

function parsePackage(entries, packagePath) {
  const packageXml = getZipText(entries, packagePath, 'the EPUB package document')

  const doc = parseXml(packageXml, 'the EPUB package document')

  const manifest = new Map()

  for (const item of doc.querySelectorAll('manifest > item[id][href]')) {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    const mediaType = item.getAttribute('media-type') || ''

    if (!id || !href) continue

    manifest.set(id, {
      href,
      mediaType,
    })
  }

  const spine = []

  for (const itemref of doc.querySelectorAll('spine > itemref[idref]')) {
    const idref = itemref.getAttribute('idref')

    const item = manifest.get(idref)

    if (!item) continue

    const mediaType = item.mediaType.toLowerCase()

    if (mediaType === 'application/xhtml+xml' || mediaType === 'text/html') {
      spine.push(resolvePath(packagePath, item.href))
    }
  }

  if (!spine.length) {
    throw new Error('The EPUB does not contain readable XHTML content in its spine.')
  }

  return spine
}

function epubToBlocks(entries, onProgress) {
  onProgress?.(0.35, 'Reading EPUB structure...')

  const packagePath = findPackagePath(entries)

  const spine = parsePackage(entries, packagePath)

  const htmlParts = []

  for (let i = 0; i < spine.length; i++) {
    const path = spine[i]

    const html = getZipText(entries, path, `spine document ${i + 1}`)

    const doc = new DOMParser().parseFromString(html, 'text/html')

    cleanHtmlDocument(doc)

    if (doc.body) {
      htmlParts.push(normalizeHtmlForPdf(doc.body.innerHTML))
    }

    onProgress?.(0.35 + ((i + 1) / spine.length) * 0.2, `Reading chapter ${i + 1} of ${spine.length}...`)
  }

  if (!htmlParts.length) {
    throw new Error('No readable content was found in the EPUB.')
  }

  return htmlToBlocks(htmlParts.join('<hr />'))
}

function textToBlocks(text) {
  const paragraphs = String(text)
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return paragraphs.length
    ? paragraphs.map((text) => ({
        type: 'paragraph',
        runs: [{ text }],
      }))
    : [
        {
          type: 'paragraph',
          runs: [{ text: '' }],
        },
      ]
}

async function buildBlocks(file, onProgress) {
  const name = file.name.toLowerCase()

  if (name.endsWith('.txt')) {
    onProgress?.(0.25, 'Reading text...')

    const text = await file.text()

    if (!text.trim()) {
      throw new Error('The text file is empty.')
    }

    return textToBlocks(text)
  }

  if (name.endsWith('.html') || name.endsWith('.htm')) {
    onProgress?.(0.25, 'Reading HTML...')

    const html = await file.text()

    if (!html.trim()) {
      throw new Error('The HTML file is empty.')
    }

    const doc = new DOMParser().parseFromString(html, 'text/html')

    cleanHtmlDocument(doc)

    if (!doc.body) {
      throw new Error('Could not find readable content in the HTML file.')
    }

    return htmlToBlocks(normalizeHtmlForPdf(doc.body.innerHTML))
  }

  if (name.endsWith('.epub')) {
    onProgress?.(0.15, 'Opening EPUB...')

    let entries

    try {
      entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
    } catch {
      throw new Error('Could not read this EPUB. The file may be corrupt or not a valid EPUB archive.')
    }

    return epubToBlocks(entries, onProgress)
  }

  throw new Error('Unsupported file type. Please choose an EPUB, HTML, or TXT file.')
}

export async function ebookToPdf(file, opts, onProgress) {
  if (!file) {
    throw new Error('Please choose an EPUB, HTML, or TXT file.')
  }

  const blocks = await buildBlocks(file, onProgress)

  onProgress?.(0.65, 'Rendering PDF pages...')

  const blob = await renderBlocksToPdf(blocks, {
    pageSize: opts?.pageSize || 'A4',
    fontSize: Number(opts?.fontSize) || 11,
  })

  onProgress?.(1, 'Done')

  return blob
}
