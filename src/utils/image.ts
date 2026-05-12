import type { Profile } from '../services/loveDateApi'
import type { PhotoStudioAnalysis, PhotoStudioControls } from '../domain'

export const buildHighResImageUrl = (url: string, width = 2400, dpr = 2): string => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (!host.includes('images.unsplash.com')) {
      return url
    }
    parsed.searchParams.set('auto', 'format')
    parsed.searchParams.set('fit', 'crop')
    parsed.searchParams.set('fm', 'webp')
    parsed.searchParams.set('w', String(width))
    parsed.searchParams.set('q', '95')
    parsed.searchParams.set('dpr', String(dpr))
    return parsed.toString()
  } catch {
    return url
  }
}

export const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Could not read media file.'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read media file.'))
    reader.readAsDataURL(blob)
  })

export const normalizeProfilePhotos = (profile: Profile): Profile => ({
  ...profile,
  photos: profile.photos.map((photo) => buildHighResImageUrl(photo, 2400, 2)),
})

export const loadImageFromSource = (source: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded'))
    image.src = source
  })
}

export const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Invalid file payload'))
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

export const analyzePhoto = async (
  source: string,
  fileSizeBytes: number,
): Promise<PhotoStudioAnalysis> => {
  const image = await loadImageFromSource(source)
  const sampleCanvas = document.createElement('canvas')
  const sampleWidth = 120
  const sampleHeight = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth))
  sampleCanvas.width = sampleWidth
  sampleCanvas.height = sampleHeight
  const context = sampleCanvas.getContext('2d')

  let averageBrightness = 50
  if (context) {
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight)
    const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data
    let totalLuminance = 0
    const pixels = data.length / 4

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      totalLuminance += 0.2126 * red + 0.7152 * green + 0.0722 * blue
    }

    averageBrightness = Math.round((totalLuminance / pixels / 255) * 100)
  }

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    aspectRatio: `${image.naturalWidth}:${image.naturalHeight}`,
    sizeKb: Math.round(fileSizeBytes / 1024),
    averageBrightness,
  }
}

export const renderEditedPhoto = async (
  source: string,
  controls: PhotoStudioControls,
): Promise<string> => {
  const image = await loadImageFromSource(source)

  if (controls.cropAspect === 'free') {
    const cropXPercent = Math.max(0, Math.min(95, controls.freeCropX))
    const cropYPercent = Math.max(0, Math.min(95, controls.freeCropY))
    const cropWidthPercent = Math.max(5, Math.min(100 - cropXPercent, controls.freeCropWidth))
    const cropHeightPercent = Math.max(5, Math.min(100 - cropYPercent, controls.freeCropHeight))

    const sourceX = Math.round((cropXPercent / 100) * image.naturalWidth)
    const sourceY = Math.round((cropYPercent / 100) * image.naturalHeight)
    const sourceWidth = Math.max(1, Math.round((cropWidthPercent / 100) * image.naturalWidth))
    const sourceHeight = Math.max(1, Math.round((cropHeightPercent / 100) * image.naturalHeight))

    const outputMaxSide = 1200
    const ratio = sourceWidth / sourceHeight
    const outputWidth = ratio >= 1 ? outputMaxSide : Math.round(outputMaxSide * ratio)
    const outputHeight = ratio >= 1 ? Math.round(outputMaxSide / ratio) : outputMaxSide

    const freeCanvas = document.createElement('canvas')
    freeCanvas.width = outputWidth
    freeCanvas.height = outputHeight
    const freeContext = freeCanvas.getContext('2d')
    if (!freeContext) {
      return source
    }

    freeContext.save()
    freeContext.fillStyle = '#0d0b12'
    freeContext.fillRect(0, 0, outputWidth, outputHeight)
    freeContext.filter = `brightness(${controls.brightness}%) contrast(${controls.contrast}%) saturate(${controls.saturate}%)`
    freeContext.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    )
    freeContext.restore()

    return freeCanvas.toDataURL('image/jpeg', 0.92)
  }

  const canvas = document.createElement('canvas')
  const outputHeight = controls.cropAspect === 'square' ? 1080 : 1200
  const ratio = controls.cropAspect === 'square' ? 1 : controls.cropAspect === 'classic' ? 3 / 4 : 4 / 5
  const outputWidth = Math.round(outputHeight * ratio)
  canvas.width = outputWidth
  canvas.height = outputHeight

  const context = canvas.getContext('2d')
  if (!context) {
    return source
  }

  const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight)
  const drawWidth = image.naturalWidth * baseScale * controls.zoom
  const drawHeight = image.naturalHeight * baseScale * controls.zoom
  const drawX = (outputWidth - drawWidth) / 2 + controls.offsetX
  const drawY = (outputHeight - drawHeight) / 2 + controls.offsetY

  context.save()
  context.fillStyle = '#0d0b12'
  context.fillRect(0, 0, outputWidth, outputHeight)
  context.translate(outputWidth / 2, outputHeight / 2)
  context.rotate((controls.rotate * Math.PI) / 180)
  context.translate(-outputWidth / 2, -outputHeight / 2)
  context.filter = `brightness(${controls.brightness}%) contrast(${controls.contrast}%) saturate(${controls.saturate}%)`
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  context.restore()

  return canvas.toDataURL('image/jpeg', 0.92)
}
