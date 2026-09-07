import { useEffect, useRef, useState } from 'react'

import DownloadButton from '../../components/DownloadButton.jsx'
import Dropzone from '../../components/Dropzone.jsx'
import Icon from '../../components/Icon.jsx'
import Note from '../../components/Note.jsx'
import Progress from '../../components/Progress.jsx'
import ResultGallery from '../../components/ResultGallery.jsx'
import { useJob } from '../../hooks/useJob.js'

import {
  autoCropDocument,
  captureVideoFrame,
  canvasToScanBlob,
  enhanceScan,
  imageFileToScan,
  scansToPdf,
} from './helpers.js'

export default function ScanDocument() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [videoReady, setVideoReady] = useState(false)

  const [pages, setPages] = useState([])
  const [autoCrop, setAutoCrop] = useState(false)
  const [grayscale, setGrayscale] = useState(false)
  const [contrast, setContrast] = useState(25)
  const [processing, setProcessing] = useState(false)

  const { run, result, error, progress, running } = useJob()

  const stopCamera = () => {
    const stream = streamRef.current

    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }

    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    setCameraActive(false)
    setVideoReady(false)
  }

  const startCamera = async () => {
    setCameraError('')
    setVideoReady(false)

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available in this browser. You can upload an image instead.')
      return
    }

    try {
      stopCamera()

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: 'environment',
          },
        },
        audio: false,
      })

      streamRef.current = stream
      setCameraActive(true)
    } catch (err) {
      console.error(err)

      setCameraError(
        'Could not access the camera. Please allow camera permission or upload an image instead.',
      )
    }
  }

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) {
      return undefined
    }

    const video = videoRef.current
    const stream = streamRef.current

    const handleLoadedMetadata = async () => {
      try {
        await video.play()
        setVideoReady(true)
      } catch (err) {
        console.error(err)
        setCameraError('Could not start the camera preview.')
      }
    }

    video.srcObject = stream

    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleLoadedMetadata()
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [cameraActive])

  useEffect(() => {
    return () => {
      const stream = streamRef.current

      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop()
        })
      }

      streamRef.current = null

      pages.forEach((page) => {
        if (page.url) {
          URL.revokeObjectURL(page.url)
        }
      })
    }
  }, [])

  const addScan = async (canvas, name) => {
    setProcessing(true)

    try {
      const cropped = autoCrop ? autoCropDocument(canvas) : canvas

      const enhanced = enhanceScan(cropped, {
        grayscale,
        contrast,
      })

      const blob = await canvasToScanBlob(enhanced)

      const url = URL.createObjectURL(blob)

      setPages((current) => [
        ...current,
        {
          blob,
          url,
          name: name || `Scan ${current.length + 1}.jpg`,
        },
      ])
    } finally {
      setProcessing(false)
    }
  }

  const capturePage = async () => {
    try {
      if (!videoRef.current || !videoReady) {
        throw new Error('Camera preview is not ready. Please wait a moment.')
      }

      const canvas = captureVideoFrame(videoRef.current)

      await addScan(canvas)

      setCameraError('')
    } catch (err) {
      console.error(err)

      setCameraError(err?.message || 'Could not capture the page.')
    }
  }

  const handleUpload = async (files) => {
    const selectedFiles = Array.from(files || [])

    if (!selectedFiles.length) {
      return
    }

    setCameraError('')

    try {
      for (const file of selectedFiles) {
        const canvas = await imageFileToScan(file)

        await addScan(canvas, file.name)
      }
    } catch (err) {
      console.error(err)

      setCameraError(err?.message || 'Could not process the image.')
    }
  }

  const removePage = (index) => {
    setPages((current) => {
      const page = current[index]

      if (page?.url) {
        URL.revokeObjectURL(page.url)
      }

      return current.filter((_, i) => i !== index)
    })
  }

  const clearPages = () => {
    pages.forEach((page) => {
      if (page.url) {
        URL.revokeObjectURL(page.url)
      }
    })

    setPages([])
  }

  const createPdf = async () => {
    if (!pages.length || running || processing) {
      return
    }

    await run((onProgress) => scansToPdf(pages, onProgress))
  }

  const output = result
    ? {
        blob: result,
        filename: 'scanned-document.pdf',
      }
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scan Document</h1>

        <p className="mt-1 text-sm text-gray-500">
          Capture document pages with your camera or upload images, enhance them, and export everything as one
          PDF.
        </p>
      </div>

      <Note>
        Everything is processed locally in your browser. Your camera images are not uploaded to a server.
      </Note>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium">Camera Scanner</h2>

            <p className="text-sm text-gray-500">Point the camera at a document and capture each page.</p>
          </div>

          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Icon name="Camera" size={18} />
              Start Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Stop Camera
            </button>
          )}
        </div>

        {cameraActive && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[70vh] w-full object-contain"
              />
            </div>

            <button
              type="button"
              onClick={capturePage}
              disabled={processing || !videoReady}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="ScanLine" size={20} />

              {videoReady ? 'Capture Page' : 'Starting Camera...'}
            </button>
          </div>
        )}

        {cameraError && <p className="mt-3 text-sm text-red-600">{cameraError}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 font-medium">Upload Pages</h2>

        <Dropzone accept="image/*" multiple onFiles={handleUpload} disabled={processing} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-medium">Scan Enhancement</h2>

            <p className="text-sm text-gray-500">Adjust the captured pages before creating the PDF.</p>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoCrop}
                onChange={(event) => setAutoCrop(event.target.checked)}
              />
              Auto Crop
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={grayscale}
                onChange={(event) => setGrayscale(event.target.checked)}
              />
              Grayscale
            </label>
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-2 block">
            Contrast: <strong>{contrast}</strong>
          </span>

          <input
            type="range"
            min="-50"
            max="100"
            value={contrast}
            onChange={(event) => setContrast(Number(event.target.value))}
            className="w-full"
          />
        </label>
      </div>

      {pages.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-medium">Scanned Pages</h2>

              <p className="text-sm text-gray-500">
                {pages.length} page
                {pages.length === 1 ? '' : 's'} ready.
              </p>
            </div>

            <button
              type="button"
              onClick={clearPages}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Clear All
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page, index) => (
              <div
                key={`${page.url}-${index}`}
                className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
              >
                <img
                  src={page.url}
                  alt={`Scanned page ${index + 1}`}
                  className="aspect-[3/4] w-full bg-gray-100 object-contain dark:bg-gray-950"
                />

                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="truncate text-sm">Page {index + 1}</span>

                  <button
                    type="button"
                    onClick={() => removePage(index)}
                    className="text-sm font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={createPdf}
            disabled={running || processing || !pages.length}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="FileText" size={20} />

            {running ? 'Creating PDF...' : 'Export PDF'}
          </button>
        </div>
      )}

      {(running || progress != null) && <Progress value={progress?.value} message={progress?.message} />}

      {error && <p className="text-sm text-red-600">{String(error)}</p>}

      {output && (
        <div className="space-y-4">
          <ResultGallery results={[output]} />

          <DownloadButton result={output} />
        </div>
      )}
    </div>
  )
}
