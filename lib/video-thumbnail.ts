// Generates a thumbnail image (JPEG) from a video file entirely in the browser.
// Loads the video into a hidden element, seeks a little way in, and captures a frame.
export async function generateVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'

      const objectUrl = URL.createObjectURL(file)
      video.src = objectUrl

      let settled = false
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl)
        video.removeAttribute('src')
        video.load()
      }
      const finish = (result: Blob | null) => {
        if (settled) return
        settled = true
        cleanup()
        resolve(result)
      }

      // Give up after 15s so a stubborn file can't hang the whole upload
      const timeout = setTimeout(() => finish(null), 15000)

      video.onloadedmetadata = () => {
        // Seek ~1s in (or 10% for very short clips) to skip black intro frames
        const target = Math.min(1, (video.duration || 2) * 0.1)
        // Guard against NaN/Infinity durations
        video.currentTime = Number.isFinite(target) ? target : 0.1
      }

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas')
          // Cap dimensions so thumbnails stay small
          const maxW = 640
          const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
          const ctx = canvas.getContext('2d')
          if (!ctx) return finish(null)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(
            (blob) => {
              clearTimeout(timeout)
              finish(blob)
            },
            'image/jpeg',
            0.8,
          )
        } catch {
          clearTimeout(timeout)
          finish(null)
        }
      }

      video.onerror = () => {
        clearTimeout(timeout)
        finish(null)
      }
    } catch {
      resolve(null)
    }
  })
}
