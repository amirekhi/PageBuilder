'use client'

// ─── Fake media library ────────────────────────────────────────────────────
// No backend, no DB, no auth. Just a static catalogue of images that live
// in /public/media/*. To add real images: drop files into public/media and
// add an entry below. "Uploads" by the user during the session are kept in
// the Zustand store (see store.ts → mediaLibrary) so they show up immediately
// without persisting anywhere — page refresh resets to this seed list.

export interface MediaItem {
  id:        string
  url:       string
  name:      string
  alt:       string
  width:     number
  height:    number
  category:  'photo' | 'illustration' | 'icon'
  sizeLabel: string   // fake file size, just for realism in the UI
}

export const SEED_MEDIA: MediaItem[] = [
  {
    id: 'm1', url: '/media/hero-1.svg', name: 'hero-1.svg', alt: 'Team working at a desk',
    width: 1600, height: 1067, category: 'photo', sizeLabel: '284 KB',
  },
  {
    id: 'm2', url: '/media/hero-2.jpg', name: 'hero-2.svg', alt: 'Modern office space',
    width: 1600, height: 1067, category: 'photo', sizeLabel: '312 KB',
  },
  {
    id: 'm3', url: '/media/product-1.jpg', name: 'product-1.svg', alt: 'Product photo on white background',
    width: 1200, height: 1200, category: 'photo', sizeLabel: '198 KB',
  },
  {
    id: 'm4', url: '/media/product-2.webp', name: 'product-2.svg', alt: 'Product detail close-up',
    width: 1200, height: 1200, category: 'photo', sizeLabel: '210 KB',
  },
  {
    id: 'm5', url: '/media/team-1.jpg', name: 'team-1.svg', alt: 'Portrait of a team member',
    width: 800, height: 800, category: 'photo', sizeLabel: '142 KB',
  },
  {
    id: 'm6', url: '/media/team-2.jpg', name: 'team-2.svg', alt: 'Portrait of a team member',
    width: 800, height: 800, category: 'photo', sizeLabel: '156 KB',
  },
  {
    id: 'm7', url: '/media/abstract-1.jpg', name: 'abstract-1.svg', alt: 'Abstract gradient background',
    width: 1920, height: 1080, category: 'illustration', sizeLabel: '402 KB',
  },
  {
    id: 'm8', url: '/media/abstract-2.jpg', name: 'abstract-2.svg', alt: 'Abstract shapes background',
    width: 1920, height: 1080, category: 'illustration', sizeLabel: '388 KB',
  },
  {
    id: 'm9', url: '/media/logo-placeholder.png', name: 'logo-placeholder.svg', alt: 'Logo placeholder',
    width: 200, height: 60, category: 'icon', sizeLabel: '4 KB',
  },
  {
    id: 'm10', url: '/media/icon-star.png', name: 'icon-star.svg', alt: 'Star icon',
    width: 64, height: 64, category: 'icon', sizeLabel: '2 KB',
  },
  {
    id: 'm11', url: '/media/testimonial-bg.jpg', name: 'testimonial-bg.svg', alt: 'Soft blurred background',
    width: 1600, height: 900, category: 'illustration', sizeLabel: '276 KB',
  },
  {
    id: 'm12', url: '/media/feature-graphic.jpg', name: 'feature-graphic.svg', alt: 'Feature illustration',
    width: 1400, height: 1000, category: 'illustration', sizeLabel: '331 KB',
  },
]

export const MEDIA_CATEGORIES: { key: MediaItem['category'] | 'all'; label: string }[] = [
  { key: 'all',           label: 'All' },
  { key: 'photo',         label: 'Photos' },
  { key: 'illustration',  label: 'Illustrations' },
  { key: 'icon',          label: 'Icons' },
]

function makeId() {
  return `upload_${Math.random().toString(36).slice(2, 9)}`
}

// Simulates a successful upload: reads the file as a data URL so it can be
// previewed/used immediately in the session without any server roundtrip.
export function fakeUploadFile(file: File): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        resolve({
          id:        makeId(),
          url:       reader.result as string,
          name:      file.name,
          alt:       file.name.replace(/\.[^/.]+$/, ''),
          width:     img.width,
          height:    img.height,
          category:  'photo',
          sizeLabel: `${Math.round(file.size / 1024)} KB`,
        })
      }
      img.onerror = () => reject(new Error('Could not read image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}