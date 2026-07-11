function handleFileChange(event) {
  const file = event.target.files[0];
  if (file.size > 100 * 1024 * 1024) {
    // Display a non-blocking warning
    setWarning('File is very large.');
  }
  // ... existing code
}