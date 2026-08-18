import { useState } from 'react'
import Dropzone from '../../components/Dropzone.jsx'
import Progress from '../../components/Progress.jsx'
import Note from '../../components/Note.jsx'
import Icon from '../../components/Icon.jsx'
import { useJob } from '../../hooks/useJob.js'
import { formatBytes } from '../../lib/format.js'
import { hashFile, isValidExpectedHash, normalizeExpectedHash } from './helpers.js'

export default function FileHash() {
  const [file, setFile] = useState(null)
  const [expected, setExpected] = useState('')
  const [copied, setCopied] = useState(false)
  const { running, progress, error, result, run, reset } = useJob()

  const pick = (files) => {
    setFile(files[0])
    setCopied(false)
    reset()
  }

  const go = () => run((p) => hashFile(file, p))

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
  }

  const normalizedExpected = normalizeExpectedHash(expected)
  const expectedInvalid = normalizedExpected.length > 0 && !isValidExpectedHash(expected)
  const matches = result && isValidExpectedHash(expected) && result === normalizedExpected

  return (
    <div className="space-y-6">
      <Dropzone
        onFiles={pick}
        multiple={false}
        label="Drop a file here or click to browse"
        hint="SHA-256 is calculated locally in your browser"
      />

      {file && (
        <>
          <div className="card flex items-center gap-3 p-3">
            <Icon name="fileText" className="h-5 w-5 text-brand-600" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          </div>
          <label className="block space-y-1">
            <span className="field-label">Expected SHA-256 hash (optional)</span>
            <input
              className="field-input font-mono"
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              placeholder="64 hexadecimal characters"
              spellCheck="false"
              aria-invalid={expectedInvalid}
            />
            {expectedInvalid && <span className="text-sm text-red-600">Enter exactly 64 hexadecimal characters.</span>}
          </label>
          <button type="button" className="btn-primary" onClick={go} disabled={running || expectedInvalid}>
            <Icon name="hash" className="h-4 w-4" />
            Calculate SHA-256
          </button>
        </>
      )}

      {running && progress && <Progress value={progress.value} message={progress.message} />}
      {error && <Note type="error" title="Hashing failed">{error}</Note>}
      {result && !running && (
        <div className="card space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">SHA-256 checksum</p>
              <code className="mt-1 block break-all font-mono text-sm text-slate-900 dark:text-slate-100">{result}</code>
            </div>
            <button type="button" className="btn-secondary shrink-0" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {isValidExpectedHash(expected) && (
            <Note type={matches ? 'info' : 'warning'} title={matches ? 'Hash matches' : 'Hash does not match'}>
              The calculated checksum {matches ? 'matches' : 'does not match'} the expected value.
            </Note>
          )}
        </div>
      )}
    </div>
  )
}
