export default {
  id: 'csv-to-pdf',
  name: 'CSV to PDF',
  description: 'Render a CSV spreadsheet as a formatted PDF table.',
  category: 'pdf',
  icon: 'table',
  order: 30,
  notes:
    'Parses CSV data and renders it as a clean, paginated table in a PDF. Supports comma, semicolon, and tab delimiters. Text cells are truncated to keep the layout tidy. Runs entirely in your browser.',
}
