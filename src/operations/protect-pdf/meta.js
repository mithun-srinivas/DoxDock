export default {
  id: 'protect-pdf',
  name: 'Protect PDF',
  description: 'Password-protect a PDF entirely in your browser.',
  category: 'pdf',
  icon: 'lock',
  order: 15,
  notes:
    'Encrypts the PDF with a user password using local qpdf WebAssembly. The password cannot be recovered if you forget it. The protected PDF must be opened with the correct password.',
}
