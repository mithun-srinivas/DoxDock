export default {
  id: 'pdf-stamp',
  name: 'Stamp PDF (Header/Footer/Bates)',
  description: 'Add headers, footers, and Bates-style sequential numbering to every page.',
  category: 'pdf',
  icon: 'hash',
  order: 17,
  notes:
    'All processing happens in your browser — no upload. Tokens {page}, {total}, and {date} are resolved per page. Bates numbers increment across pages from the start value you choose.',
}
