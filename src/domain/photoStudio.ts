export type PhotoStudioControls = {
  cropAspect: 'free' | 'portrait' | 'square' | 'classic'
  zoom: number
  rotate: number
  brightness: number
  contrast: number
  saturate: number
  offsetX: number
  offsetY: number
  freeCropX: number
  freeCropY: number
  freeCropWidth: number
  freeCropHeight: number
}

export type PhotoStudioAnalysis = {
  width: number
  height: number
  aspectRatio: string
  sizeKb: number
  averageBrightness: number
}

export type CropHandle = 'nw' | 'ne' | 'sw' | 'se'
