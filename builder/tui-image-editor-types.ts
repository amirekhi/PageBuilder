// tui-image-editor ships without consistently reliable TypeScript types
// across its published versions (the project's own TS examples use
// `import X = require(...)` CommonJS-interop syntax). This declares only
// what this app actually uses — the includeUI config surface it accepts
// is much larger (themes, locales, per-menu options, etc.); extend this
// file if you start using more of it.

declare module 'tui-image-editor' {
  export interface TuiImageEditorLoadImageOption {
    path: string
    name: string
  }

  export interface TuiImageEditorIncludeUIOption {
    loadImage: TuiImageEditorLoadImageOption
    menu?: string[]
    initMenu?: string
    menuBarPosition?: 'top' | 'bottom' | 'left' | 'right'
    uiSize?: { width?: string; height?: string }
    theme?: Record<string, string>
    [key: string]: unknown
  }

  export interface TuiImageEditorOptions {
    includeUI?: TuiImageEditorIncludeUIOption
    cssMaxWidth?: number
    cssMaxHeight?: number
    usageStatistics?: boolean
    selectionStyle?: Record<string, unknown>
    [key: string]: unknown
  }

  export interface TuiImageEditorInstance {
    toDataURL: (options?: { format?: string; quality?: number }) => string
    destroy: () => void
  }

  export default class ImageEditor implements TuiImageEditorInstance {
    constructor(container: HTMLElement, options: TuiImageEditorOptions)
    toDataURL(options?: { format?: string; quality?: number }): string
    destroy(): void
  }
}