export default {
  id: 'sanitize-pdf',
  name: 'Sanitize PDF',
  description: 'Strip embedded JavaScript, attached files, metadata and annotations.',
  category: 'pdf',
  icon: 'lock',
  order: 14,
  notes:
    'Removes the entries themselves, not just the links to them — the script source and attachment bytes actually leave the file, so they cannot be recovered by a parser. Page content is untouched, so the document looks exactly the same.',
}
