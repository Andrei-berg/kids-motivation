'use client'
import { supabase } from '@/lib/supabase'

const BUCKET = 'family-photos'
const DEFAULT_MAX_DIM = 1280
const JPEG_QUALITY = 0.30
const SMALL_FILE_THRESHOLD = 100 * 1024 // 100KB

export async function compressImage(file: File, maxDimension = DEFAULT_MAX_DIM): Promise<Blob> {
  // Skip compression for tiny files
  if (file.size <= SMALL_FILE_THRESHOLD) return file

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error('Canvas toBlob returned null'))
          else resolve(blob)
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for compression'))
    }
    img.src = url
  })
}

export async function uploadPhoto(blob: Blob, path: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  })
  if (error) throw new Error(`[photo-upload] upload failed: ${error.message}`)
  return path
}

export async function getSignedPhotoUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw new Error(`[photo-upload] signed URL failed: ${error.message}`)
  return data.signedUrl
}
