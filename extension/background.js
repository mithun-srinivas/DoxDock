// DoxDock Chrome extension (Manifest V3) background service worker.
//
// Clicking the toolbar icon opens the full DoxDock app in a new tab, served
// entirely from inside the extension (chrome-extension://<id>/index.html).
// No network, no Vercel, nothing loaded from a remote origin.
chrome.action.onClicked.addListener(async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL('index.html') })
})
