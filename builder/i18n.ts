'use client'

import { useBuilderStore, type Locale } from './store'
import type { NodeType } from './types'

// ─── Direction ──────────────────────────────────────────────────────────────
// Only two locales exist right now, so direction is simply DERIVED from
// locale rather than stored as its own independent field — the language
// toggle is meant to flip both together as one unit (per the product
// decision: this is a language switch, not a separate "mirror my LTR
// content" control). If a third, LTR-but-different language is ever added,
// this is the one place that stops being a 1:1 map.
export type Direction = 'ltr' | 'rtl'

export function directionForLocale(locale: Locale): Direction {
  return locale === 'fa' ? 'rtl' : 'ltr'
}

export function useDirection(): Direction {
  const locale = useBuilderStore(s => s.locale)
  return directionForLocale(locale)
}

// ─── Dictionary ─────────────────────────────────────────────────────────────
// Covers the shared, high-leverage panel surfaces in panelComponents.tsx
// (StylePanel/AnimationPanel/managers/SEO/ElementId/GridCellSpanField/
// BoxSpacingField/AlignField/ColorField/GradientField/HoverToggle), plus
// ControlPanel.tsx's own tab bar, Layers tab, Theme tab intro, and the two
// panel empty states, DropSlot.tsx's BlockPicker, TemplatePicker.tsx /
// EmptyCanvasPrompt, pageTemplates.ts's page-template picker/modal, and
// TopBar.tsx in full (undo/redo, Theme/SEO tab switcher, Edit/Preview mode +
// breakpoint switchers, the replay button, the Page/Pages buttons, the
// Save/Export menu and all its items, and the toast messages), and
// formNodes.tsx's Form/field panels.
// NOT yet covered: the individual per-node-type Content panels in
// nodeComponents.tsx (Button's "Label"/"Link" fields, Image's "Source"/
// "Fit" fields, Accordion's "Question"/"Answer" placeholders, etc.) — same
// mechanical useT() pattern, just not yet applied across that (very large)
// file. Flagging as a deliberate scope cut, not an oversight.
const DICT = {
  en: {
    // Tab bar / Layers / Style / Content shells (ControlPanel.tsx)
    tabLayers: 'Layers', tabStyle: 'Style', tabContent: 'Content',
    pageTree: 'Page tree',
    selectBlockForStyle: "Select a block to edit its style — or set page-wide CSS below, applied everywhere regardless of what's selected.",
    selectBlockForContent: 'Select a block to edit its content',
    resetToDesktop: 'Reset to Desktop',
    editingStyleAt: (label: string) => `Editing ${label} style`,
    editingAnimationAt: (label: string) => `Editing ${label} animation`,
    editingContentAt: (label: string) => `Editing ${label} content`,
    removeContentOverrideTitle: "Remove this breakpoint's content override",
    positionSpacingNote: 'Position, spacing, and background for Sections are set in the Content tab, where the fuller controls live.',

    // Theme tab intro (ControlPanel.tsx)
    themeTabIntro: "Colors and typography styles here apply across the whole page. Manage them below, then reuse them from any block's Style tab.",
    removeAllOverridesTitle: 'Remove all overrides for this block at this breakpoint',

    // FieldGroup section labels shared across nearly every panel
    sectionVisibility: 'Visibility', sectionPosition: 'Position', sectionSize: 'Size',
    sectionPadding: 'Padding', sectionMargin: 'Margin', sectionBackground: 'Background',
    sectionTypography: 'Typography', sectionBorder: 'Border', sectionEffects: 'Effects',
    sectionAnimation: 'Animation', sectionCustomCss: 'Custom CSS', sectionElementId: 'Element ID',
    sectionCellSpan: 'Cell span', sectionColorPalette: 'Color palette',
    sectionTypographyStyles: 'Typography styles',

    hideOnBreakpoint: (label: string) => `Hide on ${label}`,
    hideOnlyThisBreakpointNote: (label: string) =>
      `Only hides this block while viewing/editing at ${label} — it stays visible at every other breakpoint unless hidden there too.`,

    // Buttons / actions reused across panels
    addGlobalColor: '+ Add global color', addTypographyStyle: '+ Add typography style',

    // GridCellSpanField
    cellSpanColumns: 'Columns', cellSpanRows: 'Rows',
    cellSpanNote: "How many of the parent Grid's cells this block spans. A spanning block leaves a gap that later, smaller siblings automatically fill in — rearrange with drag-and-drop to control which sibling fills which gap.",

    // DropSlot / BlockPicker
    searchBlocks: 'Search blocks…', searchTemplates: 'Search templates…',
    blocksTab: 'Blocks', templatesTab: 'Templates',
    noBlocksFound: 'No blocks found', noTemplatesFound: 'No templates found',
    addABlockShort: '+ Add a block', addBlockPersistent: 'Add block',

    // TemplatePicker / EmptyCanvasPrompt
    insertTemplateIntro: 'Insert a pre-built section at the bottom of your page. You can rearrange and customise everything after.',
    emptyCanvasTitle: 'Your canvas is empty',
    emptyCanvasSubtitle: 'Start with a template or add blocks from the sidebar.',
    chooseTemplate: '+ Choose a template',
    dismiss: 'Dismiss',
    addContentTitle: 'Add content', closeAria: 'Close',

    // ── Page templates (pageTemplates.ts) ──
    pagesTab: 'Pages',
    pagesTabTitle: 'Start from a full page template',
    pageTemplatesTitle: 'Page templates',
    pageTemplatesIntro: 'Insert a complete, ready-made page — this replaces everything currently on the canvas.',
    confirmReplaceBody: "This will replace everything on your current page with this template. You can undo it afterwards with ⌘Z. Continue?",
    confirmReplaceBtn: 'Replace page',
    cancelBtn: 'Cancel',

    // ── Page-wide defaults (TopBar "Page" button + ControlPanel.tsx's
    // PageWideBadge) — selects the root node and jumps to its Style tab,
    // so typography/background set there cascades to the whole page via
    // the exact same per-node style mechanism every other block uses. ──
    pageSettingsBtn: 'Page',
    pageSettingsBtnTitle: 'Edit page-wide typography & background — applies everywhere via the root section',
    pageStyleBadge: '🌐 Page-wide style — typography set here cascades to every block on the page.',
    pageContentBadge: "🌐 Page-wide background & layout — this is your whole page's outer section.",
    pageBadgeThemeLink: 'Manage reusable colors & text styles in Theme →',

    // Language toggle — shows the OTHER language's own name, since tapping
    // it switches you TO that language.
    languageToggleLabel: 'فارسی',

    // ── BoxSpacingField ──
    sideTop: 'Top', sideRight: 'Right', sideBottom: 'Bottom', sideLeft: 'Left',
    pxUnit: 'px',
    linkedTooltip: 'Sides linked — click to edit independently',
    unlinkedTooltip: 'Sides independent — click to link',
    fieldPadding: 'Padding', fieldMargin: 'Margin', fieldGap: 'Gap',
    marginNote: 'Margin here is overridden by the Position control above whenever Position is set to anything other than "·" (None) on the matching axis',

    // ── AlignField ──
    alignHorizontal: 'Horizontal', alignVertical: 'Vertical',
    alignNoneTitle: "No override — follow the parent's Justify/Align",
    alignPinLeftTitle: 'Pin left', alignCenterXTitle: 'Center horizontally', alignPinRightTitle: 'Pin right',
    alignPinTopTitle: 'Pin top', alignCenterYTitle: 'Center vertically', alignPinBottomTitle: 'Pin bottom',
    alignNote: 'Pinning an item here overrides its parent\'s Justify/Align for THIS item specifically (like CSS align-self). Pick "·" to let the parent\'s own layout control it instead — useful when you want the container\'s Justify/Align to actually apply.',
    positionVisibleNote: "Only visible once this block's width/height is smaller than its container",

    // ── StylePanel: Size ──
    sizeWidth: 'Width', sizeHeight: 'Height', autoPlaceholder: 'Auto',
    resetToFillContainer: 'Reset to fill container',
    widthNote: "Percentage of this block's immediate parent — the same thing dragging the resize handle on the canvas does, so it stays proportionally correct across every breakpoint and Preview width. (Deliberately percentage-only here, not pixels — a fixed pixel width from this panel would look right in the editor canvas but could break at a very different Preview/live width, since everything else in this layout is relative.)",
    heightNoteContainer: "Minimum height — this container can still grow taller to fit its content. Matches dragging the bottom resize handle on the canvas.",
    heightNoteFixed: 'Fixed pixel height. Matches dragging the bottom resize handle on the canvas.',

    // ── StylePanel: Background ──
    colorLabel: 'Color', colorLabelHover: 'Color (hover)',
    gradientLabel: 'Gradient', gradientLabelHover: 'Gradient (hover)',

    // ── StylePanel: Typography ──
    fontFamilyLabel: 'Font family',
    typoSize: 'Size', typoWeight: 'Weight', typoTextAlign: 'Text align',
    textColorLabel: 'Text color', textColorLabelHover: 'Text color (hover)',
    presetLabel: 'Preset', applySavedStyle: 'Apply a saved style…',
    presetNote: "Copies that style's values onto this block once — editing the preset later in the Theme tab won't retroactively change blocks that already used it.",

    // ── StylePanel: Border ──
    borderRadiusLabel: 'Radius', borderWidthLabel: 'Width', borderWidthNone: 'None',
    borderColorLabel: 'Border color', borderColorLabelHover: 'Border color (hover)',
    borderNote: "Sets the color of this block's border. Width defaults to None (invisible) — pick 1–8px above to actually show it.",

    // ── StylePanel: Effects ──
    opacityLabel: 'Opacity', opacityLabelHover: 'Opacity (hover)',
    shadowLabel: 'Shadow', shadowLabelHover: 'Shadow (hover)',

    // ── AnimationPanel ──
    effectLabel: 'Effect', triggerLabel: 'Trigger',
    triggerOnScroll: 'On scroll into view', triggerOnLoad: 'On page load',
    durationLabel: 'Duration', delayLabel: 'Delay', easingLabel: 'Easing',
    playOnce: 'Play only once',
    effectPlaceholder: 'Pick an effect to preview it here',
    replayLabel: 'Replay',
    animationNote1: 'The swatch above previews this exact effect instantly. The editor canvas itself never animates (it always shows blocks in their final static state, so drag/resize/text-editing stay predictable) — see the real thing in Preview, and use the Replay button in the top bar to re-trigger it there.',
    animationNote2: (label: string) => `This animation applies only while viewing/editing at ${label} — Desktop keeps its own settings above unless you also override them here.`,
    removeAnimationOverrideTitle: "Remove this breakpoint's animation override",

    // ── CustomCssField ──
    customCssNoteBefore: 'Use',
    customCssNoteMid: 'in place of a selector to target just this block — e.g.',
    customCssNoteAfter: "Supports anything real CSS supports (hover states, animations, media queries) that the panel controls above can't reach.",

    // ── GlobalColorManager ──
    globalColorNote: 'Shared, LIVE colors. Bind any color field on any block to one (via the small "Global:" swatches above every color picker) and changing it here updates every bound block instantly, page-wide.',
    deleteColorTooltip: "Delete — blocks bound to this fall back to no color, they don't break",
    namePlaceholder: 'Name',

    // ── GlobalTypographyManager ──
    globalTypoNote: "Reusable text presets (size, weight, line height, alignment). Applying one from a block's Style tab COPIES these values onto it once — it's not a live link, so editing a preset here won't retroactively change blocks that already used it.",
    lineHeightLabel: 'Line height', alignLabelGeneric: 'Align',
    deleteStyleAriaLabel: 'Delete style',

    // ── ColorField ──
    globalColorsLabel: 'Global:', clearLabel: 'Clear', pickColorTitle: 'Pick a color',
    colorPlaceholder: '#ffffff or transparent',
    deletedGlobalColor: 'Deleted global color', unlinkLabel: 'Unlink',
    unlinkTitle: 'Detach from the global color — keeps this exact color as a fixed, one-off value',
    globalColorStaysLinkedTitle: (name: string) => `${name} (global — stays linked)`,
    transparentLabel: 'Transparent',

    // ── GradientField ──
    startColorTitle: 'Start color', endColorTitle: 'End color',
    dirLeftRight: '→ Left to right', dirRightLeft: '← Right to left',
    dirTopBottom: '↓ Top to bottom', dirBottomTop: '↑ Bottom to top',
    dirDiagBR: '↘ Diagonal', dirDiagBL: '↙ Diagonal', dirDiagTR: '↗ Diagonal', dirDiagTL: '↖ Diagonal',

    // ── HoverToggle ──
    hoverActiveTooltip: 'Editing the hover value — click to go back to the normal value',
    hoverSetTooltip: 'A hover value is set here — click to edit it',
    hoverUnsetTooltip: 'Click to set a different value for when the mouse hovers over this block',

    // ── SeoPanel ──
    seoSearchAppearance: 'Search appearance',
    seoPageTitle: 'Page title', seoPageTitlePlaceholder: 'A short, descriptive page title',
    seoMetaDescription: 'Meta description',
    seoMetaDescPlaceholder: 'One or two sentences describing this page for search results',
    seoKeywordsLabel: 'Keywords (optional, comma-separated)',
    seoKeywordsPlaceholder: 'landing page, page builder, no-code',
    seoKeywordsNote: 'Most search engines ignore this now, but some site-search tools and older crawlers still read it.',
    seoPreviewLabel: 'Search result preview', seoUntitledPage: 'Untitled Page',
    seoNoDescYet: 'No meta description set yet — search engines may generate one automatically from the page content instead.',
    seoSocialSharing: 'Social sharing (Open Graph)',
    seoOgNote: 'Controls how this page looks when shared on X, Facebook, LinkedIn, Slack, etc. Leave a field blank to fall back to the matching field above.',
    seoOgTitle: 'OG title', seoFallbackTitle: 'Falls back to page title',
    seoOgDescription: 'OG description', seoFallbackDesc: 'Falls back to meta description',
    seoOgImage: 'OG image', seoChooseImage: 'Choose share image (1200×630 recommended)',
    seoReplace: 'Replace', seoRemove: 'Remove',
    seoAdvanced: 'Advanced',
    seoCanonicalUrl: 'Canonical URL (optional)',
    seoCanonicalNote: 'Set this if the same content is also published at another URL, so search engines credit the right one.',
    seoNoIndex: 'Hide this page from search engines (noindex)',
    seoFavicon: 'Favicon', seoReplaceFavicon: 'Replace favicon', seoChooseFavicon: 'Choose favicon',

    // ── ElementIdField ──
    elementIdPlaceholder: 'e.g. pricing-section',
    elementIdNote: (idText: string) =>
      `Optional. Lets a Button/link elsewhere jump straight to this block using #${idText} as its link target, and gives you a stable hook for Custom CSS or your own scripts. Letters, numbers, hyphens, and underscores only.`,

    // ── TopBar: logo / undo-redo ──
    appName: 'Page Builder',
    undoTitle: 'Undo (⌘Z)', redoTitle: 'Redo (⌘Y)',

    // ── TopBar: Theme / SEO tab switcher ──
    themeTabLabel: '🎨 Theme', themeTabTitle: 'Theme — global colors & typography',
    seoTabLabel: '🔍 SEO', seoTabTitle: 'SEO — search & social metadata',

    // ── TopBar: Edit/Preview mode + breakpoint switchers ──
    editModeLabel: 'Edit', previewModeLabel: 'Preview',
    bpDesktop: 'Desktop', bpTablet: 'Tablet', bpMobile: 'Mobile',
    editBreakpointTitle: (label: string, px: number) => `Edit ${label} styles (${px}px)`,
    previewWidthTitle: (label: string, px: number) => `${label} (${px}px)`,
    editingBreakpointLabel: (label: string) => `Editing ${label}`,
    replayTitle: 'Replay animations',

    // ── TopBar: Save/Export menu ──
    saveExportTitle: 'Save / Export', saveLabel: 'Save',
    browserStorageSection: 'Browser storage',
    saveToBrowserLabel: 'Save to browser', saveToBrowserSub: '⌘S · survives refresh',
    loadFromBrowserLabel: 'Load from browser', loadFromBrowserSub: 'Restore last auto-save',
    jsonFileSection: 'JSON file',
    exportJsonLabel: 'Export as JSON', exportJsonSub: 'Download page.json',
    importJsonLabel: 'Import JSON', importJsonSub: 'Open a page.json file',
    staticHtmlSection: 'Static HTML',
    exportHtmlLabel: 'Export as HTML', exportHtmlSub: 'Works in any browser',
    publishLabel: 'Publish',

    // ── TopBar: toasts ──
    toastSaved: '✓ Saved to browser', toastSaveFailed: '✗ Save failed (storage full?)',
    toastNoSavedPage: 'No saved page found', toastPageLoaded: '✓ Page loaded',
    toastPageImported: '✓ Page imported', toastCouldNotRead: '✗ Could not read file',
    toastImportError: (err: string) => `✗ ${err}`,

    // ── nodeComponents.tsx: shared FieldGroup titles not already covered ──
    fgLayout: 'Layout', fgSource: 'Source', fgFrame: 'Frame', fgItems: 'Items',
    fgAutoplay: 'Autoplay', fgControls: 'Controls', fgGridSize: 'Grid size',
    fgLink: 'Link', fgImage: 'Image', fgAvatar: 'Avatar',
    fgTabsLabel: 'Tabs', fgTabLabel: 'Tab', fgSlides: 'Slides',

    // ── SectionPanel ──
    displayLabel: 'Display', autoAsNeeded: 'Auto (as needed)',
    directionLabel: 'Direction', justifyItemsLabel: 'Justify items',
    justifyLabel: 'Justify', alignChildrenLabel: 'Align children',
    maxWidthLabel: 'Max Width',
    secPositionNote: 'Vertical Position defaults to "·" (None), which stretches this Section\'s content to fill the full box so Justify/Align actually has room to space children apart. Pick Top/Middle/Bottom instead to shrink-wrap the content and position it within extra room (e.g. minHeight taller than the content).',
    flatColorLabel: 'Flat color', flatColorLabelHover: 'Flat color (hover)',
    editingHoverColorNote: 'Editing the hover color.',
    editingHoverGradientNote: "Editing the hover gradient. Image backgrounds below still don't have a hover variant — use Custom CSS for those.",
    chooseBgImage: 'Choose background image',
    bgSizeCover: 'Cover (fill)', bgSizeContain: 'Contain',
    overlayLabel: 'Overlay', overlayNote: 'Overlay darkens the image so text stays readable',

    // ── AvatarPanel ──
    removePhotoBtn: 'Remove photo (use initials)',
    initialsLabel: 'Initials (shown if no image)',
    diameterLabel: 'Diameter (px)',
    avatarResizeTip: 'Tip: drag the corner handle on the canvas to resize instead',

    // ── QuotePanel ──
    quoteLabel: 'Quote', roleLabel: 'Role / company',

    // ── VideoPanel ──
    videoUrlLabel: 'YouTube / Vimeo URL',
    videoUrlNote: "Paste any YouTube or Vimeo link — it's converted to an embed automatically.",
    aspectRatioLabel: 'Aspect ratio',
    ratioWide169: 'Wide 16:9', ratioStandard43: 'Standard 4:3',
    ratioSquare11: 'Square 1:1', ratioUltra219: 'Ultra 21:9',
    ratioOriginal: 'Original', ratioClassic32: 'Classic 3:2',
    roundedLabel: 'Rounded',
    pasteVideoLink: 'Paste a YouTube or Vimeo link',

    // ── AccordionPanel ──
    questionPlaceholder: 'Question', answerPlaceholder: 'Answer',
    removeItemAria: 'Remove item', addQuestionBtn: '+ Add question',

    // ── TabsPanel / TabPanePanel / TabsEditor ──
    tabWordFallback: 'Tab',
    tabsNeedOneTitle: 'Tabs needs at least one tab', removeThisTabTitle: 'Remove this tab',
    removeTabAria: 'Remove tab', addTabBtn: '+ Add tab', addATabBtn: '+ Add a tab',
    tabsClickNote: "Click a tab's header on the canvas to switch to it and edit its contents — each tab can hold any blocks, nested as deeply as you like, exactly like a Column.",
    tabLabelField: 'Tab label',
    tabLabelNote: "Shown on this tab's header button in the parent Tabs block.",

    // ── CarouselPanel / SlidePanel / CarouselEditor / CarouselPreview ──
    slideWordFallback: 'Slide',
    carouselNeedsOneTitle: 'Carousel needs at least one slide', removeThisSlideTitle: 'Remove this slide',
    removeSlideAria: 'Remove slide', addSlideBtn: '+ Add slide', addASlideBtn: '+ Add a slide',
    slidesClickNote: "Click a slide's dot or arrow on the canvas to switch to it and edit its contents — each slide can hold any blocks, exactly like a Column.",
    autoplayPreviewLabel: 'Autoplay in Preview', speedLabel: 'Speed',
    loopLabel: 'Loop back to first slide',
    autoplayNote: 'Autoplay only ever runs in Preview — the editor canvas never auto-advances on its own, so drag/selection/editing stay predictable. Automatically pauses while the mouse hovers the carousel in Preview.',
    showArrowsLabel: 'Show arrows', showDotsLabel: 'Show dots',
    minHeightLabel: 'Min height',
    minHeightNote: "Keeps the carousel a stable height across slides of different content lengths — leave blank to size to each slide's own content instead.",
    carouselCaption: (count: number) => `Carousel · ${count} slide${count === 1 ? '' : 's'}`,
    prevSlideAria: 'Previous slide', nextSlideAria: 'Next slide',
    goToSlideAria: (i: number) => `Go to slide ${i}`,
    gridCellAria: (c: number, r: number) => `${c} columns by ${r} rows`,

    // ── ListPanel ──
    addItemBtn: '+ Add item', markerLabel: 'Marker',
    markerBullet: 'Bullet', markerCheck: 'Check', markerArrow: 'Arrow', markerNumber: 'Number',

    // ── BadgePanel / ButtonPanel ──
    labelFieldLabel: 'Label', variantLabel: 'Variant',

    // ── ColumnsPanel ──
    alignItemsLabel: 'Align items',
    columnsJustifyNote: 'Justify only has room to act once at least one Column below is set to something other than its default "Fill evenly" width — otherwise every Column grows to fill the row and there\'s no leftover space to distribute.',

    // ── ColumnPanel ──
    widthModeLabel: 'Mode', modeFillEvenly: 'Fill evenly (default)', modeFixedPixels: 'Fixed pixels',
    modeHalf: 'Half', modeThird: 'Third', modeTwoThirds: 'Two thirds',
    modeQuarter: 'Quarter', modeThreeQuarters: 'Three quarters',
    widthPxLabel: 'Width (px)',
    columnWidthNote: '"Fill evenly" makes every un-sized Column in this row share the space equally. Set a Column to anything else here to give the Columns block\'s own Justify option (in its own panel) room to actually distribute leftover space.',

    // ── GridPanel ──
    gridSizeNote: 'Click a cell above to set the column/row count. Blocks placed inside fill cells in order — select a block sitting in this Grid and use its "Cell span" control (its own Content tab) to make it take up more than one cell.',
    gridSizeCaption: (cols: number, rows: number) => `${cols} × ${rows} grid`,
    rowHeightLabel: 'Row height', pxMinLabel: 'px min',

    // ── TextPanel / HeadingPanel ──
    textFieldLabel: 'Text',
    textTip: 'Tip: double-click the text on the canvas for the full formatting toolbar (bold, links, lists, alignment…)',
    dblClickEditText: 'Double-click to edit text…',
    tagLabel: 'Tag',
    headingTip: 'Tip: double-click the heading on the canvas for the full formatting toolbar',
    dblClickEditHeading: 'Double-click to edit heading…',

    // ── ImagePanel / ImageEditor ──
    browseMediaBtn: 'Browse media library', replaceImageBtn: 'Replace image', editImageBtn: 'Edit image',
    urlLabel: 'URL (or paste a link)', altTextLabel: 'Alt text',
    widthModeFieldLabel: 'Width mode', modeFillContainer: 'Fill container',
    imageFixedPxNote: "Fixed pixels keeps this image the same size no matter what container it's placed in — combine with Position below to place it left/center/right in a wider container",
    fitLabel: 'Fit', fitCover: 'Cover (fill & crop)', fitContain: 'Contain (fit inside)',
    fitFill: 'Fill (stretch)', fitNone: 'None (original size)',
    focalPointLabel: 'Focal point',
    clickChooseImage: 'Click to choose an image',

    // ── ButtonPanel ──
    linkTypeLabel: 'Type', linkTypeRelative: 'Relative (#anchor, /path)', linkTypeAbsolute: 'Absolute (https://…)',
    linkAbsoluteNote: 'https:// is added automatically if you leave it off.',
    linkRelativeNote: 'Used exactly as typed — good for in-page anchors (an Element ID elsewhere on this page, e.g. "#pricing") or paths on this same site (e.g. "/pricing").',
    openNewTabLabel: 'Open in new tab',
    buttonPositionNote: "Only visible once this block's container is wider/taller than the button itself",

    // ── SpacerPanel / SpacerEditor ──
    heightPxLabel: 'Height (px)',
    spacerTip: 'Tip: drag the bottom handle on the canvas to resize instead',
    spacerCanvasLabel: (h: number) => `spacer ${h}px`,

    // ── DividerPanel ──
    dividerPositionNote: "Only has a visible effect if this Divider's width/height has been resized smaller than its container",

    // ── FormPanel / field panels (formNodes.tsx) ──
    formNoDestinationWarning: 'No destination set — add a URL in the Content tab so submissions actually go somewhere.',
    formDestinationSection: 'Destination',
    formActionLabel: 'Send submissions to (URL)',
    formActionNote: 'Where the form data is sent when someone submits — e.g. a Formspree/Getform endpoint, a Zapier webhook, or your own API route.',
    formMethodLabel: 'Method',
    formSubmitAsJsonLabel: 'Send as JSON',
    formSubmitAsJsonNote: 'Off sends normal form-data (works with most form-backend services out of the box). On sends a JSON body instead — use this only if your endpoint specifically expects JSON.',
    formMessagesSection: 'Messages',
    formSuccessMessageLabel: 'Success message',
    formErrorMessageLabel: 'Error message',
    formLabelFieldLabel: 'Field label',
    formPlaceholderLabel: 'Placeholder',
    formFieldTypeLabel: 'Field type',
    formRequiredLabel: 'Required',
    formFieldNameSection: 'Field name',
    formFieldNameNote: 'The key this field is submitted under (e.g. "email"). Letters, numbers, hyphens, and underscores only.',
    formRowsLabel: 'Rows',
    formOptionsSection: 'Options',
    formAddOptionBtn: '+ Add option',
  },
  fa: {
    tabLayers: 'لایه‌ها', tabStyle: 'استایل', tabContent: 'محتوا',
    pageTree: 'درخت صفحه',
    selectBlockForStyle: 'یک بلوک را برای ویرایش استایل انتخاب کنید — یا CSS سراسری صفحه را در پایین تنظیم کنید که صرف‌نظر از انتخاب فعلی روی همه‌جا اعمال می‌شود.',
    selectBlockForContent: 'یک بلوک را برای ویرایش محتوا انتخاب کنید',
    resetToDesktop: 'بازگشت به دسکتاپ',
    editingStyleAt: (label: string) => `در حال ویرایش استایل ${label}`,
    editingAnimationAt: (label: string) => `در حال ویرایش انیمیشن ${label}`,
    editingContentAt: (label: string) => `در حال ویرایش محتوای ${label}`,
    removeContentOverrideTitle: 'حذف بازنویسی محتوای این اندازه صفحه',
    positionSpacingNote: 'موقعیت، فاصله‌گذاری و پس‌زمینه بخش‌ها در تب محتوا تنظیم می‌شوند، جایی که کنترل‌های کامل‌تر قرار دارند.',

    themeTabIntro: 'رنگ‌ها و استایل‌های تایپوگرافی در اینجا در کل صفحه اعمال می‌شوند. آن‌ها را در پایین مدیریت کنید، سپس از تب استایل هر بلوکی دوباره از آن‌ها استفاده کنید.',
    removeAllOverridesTitle: 'حذف همه بازنویسی‌های این بلوک در این اندازه صفحه',

    sectionVisibility: 'نمایش', sectionPosition: 'موقعیت', sectionSize: 'اندازه',
    sectionPadding: 'فاصله داخلی', sectionMargin: 'فاصله بیرونی', sectionBackground: 'پس‌زمینه',
    sectionTypography: 'تایپوگرافی', sectionBorder: 'حاشیه', sectionEffects: 'جلوه‌ها',
    sectionAnimation: 'انیمیشن', sectionCustomCss: 'CSS دلخواه', sectionElementId: 'شناسه المان',
    sectionCellSpan: 'اشغال خانه‌ها', sectionColorPalette: 'پالت رنگ',
    sectionTypographyStyles: 'استایل‌های تایپوگرافی',

    hideOnBreakpoint: (label: string) => `مخفی در ${label}`,
    hideOnlyThisBreakpointNote: (label: string) =>
      `این بلوک را فقط هنگام مشاهده/ویرایش در ${label} مخفی می‌کند — در سایر اندازه‌ها همچنان نمایان است مگر آنجا هم مخفی شود.`,

    addGlobalColor: '+ افزودن رنگ سراسری', addTypographyStyle: '+ افزودن استایل تایپوگرافی',

    cellSpanColumns: 'ستون‌ها', cellSpanRows: 'ردیف‌ها',
    cellSpanNote: 'این بلوک چند خانه از گرید والد را اشغال می‌کند. یک بلوک اشغال‌کننده فضای خالی برای عناصر بعدی و کوچک‌تر می‌گذارد که به‌طور خودکار پر می‌شود — با کشیدن و رها کردن ترتیب را تغییر دهید تا مشخص شود کدام عنصر کدام فضای خالی را پر می‌کند.',

    searchBlocks: 'جستجوی بلوک‌ها…', searchTemplates: 'جستجوی قالب‌ها…',
    blocksTab: 'بلوک‌ها', templatesTab: 'قالب‌ها',
    noBlocksFound: 'بلوکی یافت نشد', noTemplatesFound: 'قالبی یافت نشد',
    addABlockShort: '+ افزودن بلوک', addBlockPersistent: 'افزودن بلوک',

    insertTemplateIntro: 'یک بخش آماده را در پایین صفحه خود درج کنید. بعداً می‌توانید همه‌چیز را جابه‌جا و سفارشی کنید.',
    emptyCanvasTitle: 'بوم شما خالی است',
    emptyCanvasSubtitle: 'با یک قالب شروع کنید یا از نوار کناری بلوک اضافه کنید.',
    chooseTemplate: '+ انتخاب قالب',
    dismiss: 'رد کردن',
    addContentTitle: 'افزودن محتوا', closeAria: 'بستن',

    // ── Page templates (pageTemplates.ts) ──
    pagesTab: 'صفحات',
    pagesTabTitle: 'شروع از یک قالب صفحه کامل',
    pageTemplatesTitle: 'قالب‌های صفحه',
    pageTemplatesIntro: 'یک صفحه کامل و آماده درج کنید — این کار همه‌چیز روی بوم فعلی را جایگزین می‌کند.',
    confirmReplaceBody: 'این کار همه‌چیز روی صفحه فعلی شما را با این قالب جایگزین می‌کند. بعداً می‌توانید با ⌘Z آن را واگرد کنید. ادامه می‌دهید؟',
    confirmReplaceBtn: 'جایگزینی صفحه',
    cancelBtn: 'انصراف',

    // ── Page-wide defaults ──
    pageSettingsBtn: 'صفحه',
    pageSettingsBtnTitle: 'ویرایش تایپوگرافی و پس‌زمینه کل صفحه — از طریق بخش ریشه در همه‌جا اعمال می‌شود',
    pageStyleBadge: '🌐 استایل کل صفحه — تایپوگرافی تنظیم‌شده در اینجا به همه بلوک‌های صفحه سرایت می‌کند.',
    pageContentBadge: '🌐 پس‌زمینه و چیدمان کل صفحه — این همان بخش بیرونیِ کل صفحه شماست.',
    pageBadgeThemeLink: 'مدیریت رنگ‌ها و استایل‌های متنی قابل استفاده مجدد در پوسته ←',

    languageToggleLabel: 'English',

    // ── BoxSpacingField ──
    sideTop: 'بالا', sideRight: 'راست', sideBottom: 'پایین', sideLeft: 'چپ',
    pxUnit: 'پیکسل',
    linkedTooltip: 'اضلاع به هم متصل‌اند — برای ویرایش مستقل کلیک کنید',
    unlinkedTooltip: 'اضلاع مستقل‌اند — برای اتصال کلیک کنید',
    fieldPadding: 'فاصله داخلی', fieldMargin: 'فاصله بیرونی', fieldGap: 'فاصله میان عناصر',
    marginNote: 'فاصله بیرونی در اینجا هرگاه موقعیت (Position) در بالا روی چیزی غیر از "·" (هیچ) در همان محور تنظیم شود، بازنویسی می‌شود.',

    // ── AlignField ──
    alignHorizontal: 'افقی', alignVertical: 'عمودی',
    alignNoneTitle: 'بدون بازنویسی — از تنظیمات هم‌ترازی والد پیروی می‌کند',
    alignPinLeftTitle: 'چسباندن به چپ', alignCenterXTitle: 'وسط‌چین افقی', alignPinRightTitle: 'چسباندن به راست',
    alignPinTopTitle: 'چسباندن به بالا', alignCenterYTitle: 'وسط‌چین عمودی', alignPinBottomTitle: 'چسباندن به پایین',
    alignNote: 'چسباندن یک آیتم در اینجا هم‌ترازی والد را فقط برای همین آیتم بازنویسی می‌کند (مانند align-self در CSS). گزینه "·" را انتخاب کنید تا چیدمان خود والد کنترل را به‌دست بگیرد — زمانی مفید است که می‌خواهید هم‌ترازی کانتینر واقعاً اعمال شود.',
    positionVisibleNote: 'فقط زمانی نمایان می‌شود که عرض/ارتفاع این بلوک از کانتینرش کوچک‌تر باشد',

    // ── StylePanel: Size ──
    sizeWidth: 'عرض', sizeHeight: 'ارتفاع', autoPlaceholder: 'خودکار',
    resetToFillContainer: 'بازگشت به پر کردن کانتینر',
    widthNote: 'درصدی از والد مستقیم این بلوک — دقیقاً همان کاری که کشیدن دستگیره تغییر اندازه روی بوم انجام می‌دهد، بنابراین در هر اندازه صفحه و پیش‌نمایش به‌درستی نسبی می‌ماند. (عمداً فقط درصدی است، نه پیکسلی — یک عرض پیکسلی ثابت از این پنل در بوم ویرایشگر درست به‌نظر می‌رسد اما ممکن است در عرض متفاوت پیش‌نمایش/زنده به‌هم بریزد، چون بقیه این چیدمان نسبی است.)',
    heightNoteContainer: 'حداقل ارتفاع — این کانتینر همچنان می‌تواند برای جا دادن محتوایش بلندتر شود. مطابق با کشیدن دستگیره تغییر اندازه پایین در بوم.',
    heightNoteFixed: 'ارتفاع پیکسلی ثابت. مطابق با کشیدن دستگیره تغییر اندازه پایین در بوم.',

    // ── StylePanel: Background ──
    colorLabel: 'رنگ', colorLabelHover: 'رنگ (هاور)',
    gradientLabel: 'گرادیان', gradientLabelHover: 'گرادیان (هاور)',

    // ── StylePanel: Typography ──
    fontFamilyLabel: 'فونت',
    typoSize: 'اندازه', typoWeight: 'وزن', typoTextAlign: 'ترازبندی متن',
    textColorLabel: 'رنگ متن', textColorLabelHover: 'رنگ متن (هاور)',
    presetLabel: 'الگو', applySavedStyle: 'اعمال یک استایل ذخیره‌شده…',
    presetNote: 'مقادیر این استایل را یک‌بار روی این بلوک کپی می‌کند — ویرایش بعدی این الگو در تب پوسته، بلوک‌هایی که قبلاً از آن استفاده کرده‌اند را تغییر نمی‌دهد.',

    // ── StylePanel: Border ──
    borderRadiusLabel: 'شعاع گردی', borderWidthLabel: 'ضخامت', borderWidthNone: 'هیچ',
    borderColorLabel: 'رنگ حاشیه', borderColorLabelHover: 'رنگ حاشیه (هاور)',
    borderNote: 'رنگ حاشیه این بلوک را تنظیم می‌کند. ضخامت به‌طور پیش‌فرض روی هیچ (نامرئی) است — برای نمایش واقعی، ۱ تا ۸ پیکسل را در بالا انتخاب کنید.',

    // ── StylePanel: Effects ──
    opacityLabel: 'شفافیت', opacityLabelHover: 'شفافیت (هاور)',
    shadowLabel: 'سایه', shadowLabelHover: 'سایه (هاور)',

    // ── AnimationPanel ──
    effectLabel: 'جلوه', triggerLabel: 'محرک',
    triggerOnScroll: 'هنگام ورود به دید در اسکرول', triggerOnLoad: 'هنگام بارگذاری صفحه',
    durationLabel: 'مدت زمان', delayLabel: 'تاخیر', easingLabel: 'نرمی حرکت',
    playOnce: 'فقط یک‌بار پخش شود',
    effectPlaceholder: 'برای پیش‌نمایش، یک جلوه انتخاب کنید',
    replayLabel: 'پخش دوباره',
    animationNote1: 'نمونه بالا این جلوه را دقیقاً همین‌الان پیش‌نمایش می‌دهد. بوم ویرایشگر خودش هرگز متحرک نمی‌شود (همیشه بلوک‌ها را در حالت نهایی و ثابت نشان می‌دهد تا کشیدن/تغییر اندازه/ویرایش متن قابل پیش‌بینی بماند) — نسخه واقعی را در پیش‌نمایش ببینید و از دکمه پخش دوباره در نوار بالا برای اجرای دوباره آن استفاده کنید.',
    animationNote2: (label: string) => `این انیمیشن فقط هنگام مشاهده/ویرایش در ${label} اعمال می‌شود — دسکتاپ تنظیمات خودش را در بالا حفظ می‌کند مگر اینکه اینجا هم آن‌ها را بازنویسی کنید.`,
    removeAnimationOverrideTitle: 'حذف بازنویسی انیمیشن این اندازه صفحه',

    // ── CustomCssField ──
    customCssNoteBefore: 'به‌جای یک انتخابگر، از',
    customCssNoteMid: 'برای هدف قرار دادن فقط همین بلوک استفاده کنید — برای مثال',
    customCssNoteAfter: 'از هر ویژگی واقعی CSS (حالت هاور، انیمیشن، مدیا-کوئری) که کنترل‌های بالا امکان دسترسی به آن را ندارند پشتیبانی می‌کند.',

    // ── GlobalColorManager ──
    globalColorNote: 'رنگ‌های سراسری و زنده. هر فیلد رنگ در هر بلوکی را به یکی از این‌ها متصل کنید (از طریق نمونه‌های کوچک "سراسری:" بالای هر انتخاب‌گر رنگ) و تغییر آن در اینجا فوراً همه بلوک‌های متصل را در کل صفحه به‌روزرسانی می‌کند.',
    deleteColorTooltip: 'حذف — بلوک‌های متصل به این رنگ بدون رنگ می‌مانند، خراب نمی‌شوند',
    namePlaceholder: 'نام',

    // ── GlobalTypographyManager ──
    globalTypoNote: 'الگوهای متنی قابل استفاده مجدد (اندازه، وزن، ارتفاع خط، ترازبندی). اعمال یکی از آن‌ها از تب استایل یک بلوک، مقادیر را فقط یک‌بار روی آن کپی می‌کند — لینک زنده نیست، پس ویرایش یک الگو در اینجا بلوک‌هایی که قبلاً از آن استفاده کرده‌اند را تغییر نمی‌دهد.',
    lineHeightLabel: 'ارتفاع خط', alignLabelGeneric: 'ترازبندی',
    deleteStyleAriaLabel: 'حذف استایل',

    // ── ColorField ──
    globalColorsLabel: 'سراسری:', clearLabel: 'پاک کردن', pickColorTitle: 'انتخاب رنگ',
    colorPlaceholder: '#ffffff یا transparent',
    deletedGlobalColor: 'رنگ سراسری حذف‌شده', unlinkLabel: 'قطع اتصال',
    unlinkTitle: 'جدا کردن از رنگ سراسری — این رنگ دقیق را به‌عنوان یک مقدار ثابت و یک‌باره نگه می‌دارد',
    globalColorStaysLinkedTitle: (name: string) => `${name} (سراسری — متصل می‌ماند)`,
    transparentLabel: 'شفاف',

    // ── GradientField ──
    startColorTitle: 'رنگ شروع', endColorTitle: 'رنگ پایان',
    dirLeftRight: '→ چپ به راست', dirRightLeft: '← راست به چپ',
    dirTopBottom: '↓ بالا به پایین', dirBottomTop: '↑ پایین به بالا',
    dirDiagBR: '↘ مورب', dirDiagBL: '↙ مورب', dirDiagTR: '↗ مورب', dirDiagTL: '↖ مورب',

    // ── HoverToggle ──
    hoverActiveTooltip: 'در حال ویرایش مقدار هاور — برای بازگشت به مقدار عادی کلیک کنید',
    hoverSetTooltip: 'یک مقدار هاور برای این فیلد تنظیم شده — برای ویرایش آن کلیک کنید',
    hoverUnsetTooltip: 'برای تنظیم مقداری متفاوت برای زمانی که ماوس روی این بلوک قرار می‌گیرد کلیک کنید',

    // ── SeoPanel ──
    seoSearchAppearance: 'نمایش در نتایج جستجو',
    seoPageTitle: 'عنوان صفحه', seoPageTitlePlaceholder: 'یک عنوان کوتاه و توصیفی برای صفحه',
    seoMetaDescription: 'توضیحات متا',
    seoMetaDescPlaceholder: 'یک یا دو جمله برای توصیف این صفحه در نتایج جستجو',
    seoKeywordsLabel: 'کلمات کلیدی (اختیاری، با کاما جدا شود)',
    seoKeywordsPlaceholder: 'صفحه فرود، صفحه‌ساز، بدون کد',
    seoKeywordsNote: 'بیشتر موتورهای جستجو اکنون این را نادیده می‌گیرند، اما برخی ابزارهای جستجوی داخل سایت و خزنده‌های قدیمی‌تر هنوز آن را می‌خوانند.',
    seoPreviewLabel: 'پیش‌نمایش نتیجه جستجو', seoUntitledPage: 'صفحه بدون عنوان',
    seoNoDescYet: 'هنوز توضیحات متایی تنظیم نشده — موتورهای جستجو ممکن است به‌جای آن یکی را خودکار از محتوای صفحه بسازند.',
    seoSocialSharing: 'اشتراک‌گذاری اجتماعی (Open Graph)',
    seoOgNote: 'نحوه نمایش این صفحه هنگام اشتراک‌گذاری در ایکس، فیس‌بوک، لینکدین، اسلک و غیره را کنترل می‌کند. یک فیلد را خالی بگذارید تا از فیلد متناظر در بالا استفاده شود.',
    seoOgTitle: 'عنوان OG', seoFallbackTitle: 'در صورت خالی بودن، از عنوان صفحه استفاده می‌شود',
    seoOgDescription: 'توضیحات OG', seoFallbackDesc: 'در صورت خالی بودن، از توضیحات متا استفاده می‌شود',
    seoOgImage: 'تصویر OG', seoChooseImage: 'انتخاب تصویر اشتراک‌گذاری (پیشنهاد: ۱۲۰۰×۶۳۰)',
    seoReplace: 'جایگزینی', seoRemove: 'حذف',
    seoAdvanced: 'پیشرفته',
    seoCanonicalUrl: 'آدرس اصلی — Canonical (اختیاری)',
    seoCanonicalNote: 'اگر همین محتوا در آدرس دیگری هم منتشر شده، این را تنظیم کنید تا موتورهای جستجو آدرس درست را در نظر بگیرند.',
    seoNoIndex: 'مخفی کردن این صفحه از موتورهای جستجو (noindex)',
    seoFavicon: 'فاویکون', seoReplaceFavicon: 'جایگزینی فاویکون', seoChooseFavicon: 'انتخاب فاویکون',

    // ── ElementIdField ──
    elementIdPlaceholder: 'مثلاً pricing-section',
    elementIdNote: (idText: string) =>
      `اختیاری. به یک دکمه/لینک در جای دیگر اجازه می‌دهد مستقیماً با استفاده از #${idText} به این بلوک بپرد، و یک نقطه اتصال پایدار برای CSS دلخواه یا اسکریپت‌های خودتان فراهم می‌کند. فقط حروف، اعداد، خط تیره و زیرخط مجاز است.`,

    // ── TopBar: logo / undo-redo ──
    appName: 'صفحه‌ساز',
    undoTitle: 'واگرد (⌘Z)', redoTitle: 'ازنو (⌘Y)',

    // ── TopBar: Theme / SEO tab switcher ──
    themeTabLabel: '🎨 پوسته', themeTabTitle: 'پوسته — رنگ‌ها و تایپوگرافی سراسری',
    seoTabLabel: '🔍 سئو', seoTabTitle: 'سئو — متادیتای جستجو و اجتماعی',

    // ── TopBar: Edit/Preview mode + breakpoint switchers ──
    editModeLabel: 'ویرایش', previewModeLabel: 'پیش‌نمایش',
    bpDesktop: 'دسکتاپ', bpTablet: 'تبلت', bpMobile: 'موبایل',
    editBreakpointTitle: (label: string, px: number) => `ویرایش استایل ${label} (${px}px)`,
    previewWidthTitle: (label: string, px: number) => `${label} (${px}px)`,
    editingBreakpointLabel: (label: string) => `در حال ویرایش ${label}`,
    replayTitle: 'پخش دوباره انیمیشن‌ها',

    // ── TopBar: Save/Export menu ──
    saveExportTitle: 'ذخیره / خروجی', saveLabel: 'ذخیره',
    browserStorageSection: 'حافظه مرورگر',
    saveToBrowserLabel: 'ذخیره در مرورگر', saveToBrowserSub: '⌘S · پس از رفرش باقی می‌ماند',
    loadFromBrowserLabel: 'بارگذاری از مرورگر', loadFromBrowserSub: 'بازیابی آخرین ذخیره خودکار',
    jsonFileSection: 'فایل JSON',
    exportJsonLabel: 'خروجی JSON', exportJsonSub: 'دانلود page.json',
    importJsonLabel: 'ورودی JSON', importJsonSub: 'باز کردن یک فایل page.json',
    staticHtmlSection: 'HTML ایستا',
    exportHtmlLabel: 'خروجی HTML', exportHtmlSub: 'در هر مرورگری کار می‌کند',
    publishLabel: 'انتشار',

    // ── TopBar: toasts ──
    toastSaved: '✓ در مرورگر ذخیره شد', toastSaveFailed: '✗ ذخیره ناموفق بود (حافظه پر است؟)',
    toastNoSavedPage: 'صفحه ذخیره‌شده‌ای یافت نشد', toastPageLoaded: '✓ صفحه بارگذاری شد',
    toastPageImported: '✓ صفحه وارد شد', toastCouldNotRead: '✗ خواندن فایل ممکن نشد',
    toastImportError: (err: string) => `✗ ${err}`,

    // ── nodeComponents.tsx: shared FieldGroup titles not already covered ──
    fgLayout: 'چیدمان', fgSource: 'منبع', fgFrame: 'قاب', fgItems: 'موارد',
    fgAutoplay: 'پخش خودکار', fgControls: 'کنترل‌ها', fgGridSize: 'اندازه گرید',
    fgLink: 'لینک', fgImage: 'تصویر', fgAvatar: 'آواتار',
    fgTabsLabel: 'تب‌ها', fgTabLabel: 'تب', fgSlides: 'اسلایدها',

    // ── SectionPanel ──
    displayLabel: 'نمایش', autoAsNeeded: 'خودکار (در صورت نیاز)',
    directionLabel: 'جهت', justifyItemsLabel: 'ترازبندی موارد (Justify)',
    justifyLabel: 'ترازبندی (Justify)', alignChildrenLabel: 'هم‌ترازی فرزندان',
    maxWidthLabel: 'حداکثر عرض',
    secPositionNote: 'موقعیت عمودی به‌طور پیش‌فرض روی "·" (هیچ) است که محتوای این بخش را برای پر کردن کل جعبه کشیده می‌کند تا ترازبندی واقعاً فضایی برای فاصله دادن فرزندان داشته باشد. به‌جای آن بالا/وسط/پایین را انتخاب کنید تا محتوا جمع‌وجور شود و در فضای اضافه (مثلاً حداقل ارتفاعی بلندتر از محتوا) جای‌گذاری شود.',
    flatColorLabel: 'رنگ یکدست', flatColorLabelHover: 'رنگ یکدست (هاور)',
    editingHoverColorNote: 'در حال ویرایش رنگ هاور.',
    editingHoverGradientNote: 'در حال ویرایش گرادیان هاور. تصاویر پس‌زمینه در پایین هنوز حالت هاور ندارند — برای آن‌ها از CSS دلخواه استفاده کنید.',
    chooseBgImage: 'انتخاب تصویر پس‌زمینه',
    bgSizeCover: 'پوشش کامل (Cover)', bgSizeContain: 'جا دادن کامل (Contain)',
    overlayLabel: 'روکش تیرگی', overlayNote: 'روکش تصویر را تیره می‌کند تا متن خوانا بماند',

    // ── AvatarPanel ──
    removePhotoBtn: 'حذف عکس (استفاده از حروف اول)',
    initialsLabel: 'حروف اول (در صورت نبود تصویر نمایش داده می‌شود)',
    diameterLabel: 'قطر (پیکسل)',
    avatarResizeTip: 'نکته: به‌جای این کار، دستگیره گوشه را روی بوم بکشید',

    // ── QuotePanel ──
    quoteLabel: 'نقل‌قول', roleLabel: 'نقش / شرکت',

    // ── VideoPanel ──
    videoUrlLabel: 'لینک یوتیوب / ویمیو',
    videoUrlNote: 'هر لینک یوتیوب یا ویمیویی را جای‌گذاری کنید — به‌طور خودکار به حالت جاسازی‌شده تبدیل می‌شود.',
    aspectRatioLabel: 'نسبت ابعاد',
    ratioWide169: 'عریض ۱۶:۹', ratioStandard43: 'استاندارد ۴:۳',
    ratioSquare11: 'مربع ۱:۱', ratioUltra219: 'فوق‌عریض ۲۱:۹',
    ratioOriginal: 'اصلی', ratioClassic32: 'کلاسیک ۳:۲',
    roundedLabel: 'گردی',
    pasteVideoLink: 'یک لینک یوتیوب یا ویمیو جای‌گذاری کنید',

    // ── AccordionPanel ──
    questionPlaceholder: 'پرسش', answerPlaceholder: 'پاسخ',
    removeItemAria: 'حذف مورد', addQuestionBtn: '+ افزودن پرسش',

    // ── TabsPanel / TabPanePanel / TabsEditor ──
    tabWordFallback: 'تب',
    tabsNeedOneTitle: 'حداقل به یک تب نیاز است', removeThisTabTitle: 'حذف این تب',
    removeTabAria: 'حذف تب', addTabBtn: '+ افزودن تب', addATabBtn: '+ افزودن یک تب',
    tabsClickNote: 'روی سربرگ یک تب در بوم کلیک کنید تا به آن سوییچ کرده و محتوایش را ویرایش کنید — هر تب می‌تواند هر بلوکی را نگه دارد، تا هر عمقی که بخواهید، دقیقاً مثل یک ستون.',
    tabLabelField: 'برچسب تب',
    tabLabelNote: 'روی دکمه سربرگ این تب در بلوک تب‌های والد نمایش داده می‌شود.',

    // ── CarouselPanel / SlidePanel / CarouselEditor / CarouselPreview ──
    slideWordFallback: 'اسلاید',
    carouselNeedsOneTitle: 'حداقل به یک اسلاید نیاز است', removeThisSlideTitle: 'حذف این اسلاید',
    removeSlideAria: 'حذف اسلاید', addSlideBtn: '+ افزودن اسلاید', addASlideBtn: '+ افزودن یک اسلاید',
    slidesClickNote: 'روی نقطه یا فلش یک اسلاید در بوم کلیک کنید تا به آن سوییچ کرده و محتوایش را ویرایش کنید — هر اسلاید می‌تواند هر بلوکی را نگه دارد، دقیقاً مثل یک ستون.',
    autoplayPreviewLabel: 'پخش خودکار در پیش‌نمایش', speedLabel: 'سرعت',
    loopLabel: 'بازگشت به اسلاید اول',
    autoplayNote: 'پخش خودکار فقط در پیش‌نمایش اجرا می‌شود — بوم ویرایشگر هرگز خودش جلو نمی‌رود، تا کشیدن/انتخاب/ویرایش قابل پیش‌بینی بماند. با قرار گرفتن ماوس روی کاروسل در پیش‌نمایش، به‌طور خودکار متوقف می‌شود.',
    showArrowsLabel: 'نمایش فلش‌ها', showDotsLabel: 'نمایش نقطه‌ها',
    minHeightLabel: 'حداقل ارتفاع',
    minHeightNote: 'کاروسل را در ارتفاعی ثابت نگه می‌دارد، حتی با اسلایدهایی با طول محتوای متفاوت — برای اندازه‌گیری بر اساس محتوای هر اسلاید، خالی بگذارید.',
    carouselCaption: (count: number) => `کاروسل · ${count} اسلاید`,
    prevSlideAria: 'اسلاید قبلی', nextSlideAria: 'اسلاید بعدی',
    goToSlideAria: (i: number) => `رفتن به اسلاید ${i}`,
    gridCellAria: (c: number, r: number) => `${c} ستون در ${r} ردیف`,

    // ── ListPanel ──
    addItemBtn: '+ افزودن مورد', markerLabel: 'نشانگر',
    markerBullet: 'نقطه', markerCheck: 'تیک', markerArrow: 'فلش', markerNumber: 'شماره',

    // ── BadgePanel / ButtonPanel ──
    labelFieldLabel: 'برچسب', variantLabel: 'گونه',

    // ── ColumnsPanel ──
    alignItemsLabel: 'هم‌ترازی موارد',
    columnsJustifyNote: 'ترازبندی (Justify) فقط زمانی اثر دارد که حداقل یک ستون در پایین چیزی غیر از عرض پیش‌فرض "پر کردن یکسان" داشته باشد — در غیر این صورت هر ستون برای پر کردن ردیف رشد می‌کند و فضای اضافه‌ای برای توزیع باقی نمی‌ماند.',

    // ── ColumnPanel ──
    widthModeLabel: 'حالت', modeFillEvenly: 'پر کردن یکسان (پیش‌فرض)', modeFixedPixels: 'پیکسل ثابت',
    modeHalf: 'نصف', modeThird: 'یک‌سوم', modeTwoThirds: 'دوسوم',
    modeQuarter: 'یک‌چهارم', modeThreeQuarters: 'سه‌چهارم',
    widthPxLabel: 'عرض (پیکسل)',
    columnWidthNote: '"پر کردن یکسان" باعث می‌شود هر ستون بدون اندازه در این ردیف فضا را به‌طور مساوی سهیم شود. یک ستون را روی چیز دیگری تنظیم کنید تا گزینه ترازبندی خودِ بلوک ستون‌ها (در پنل خودش) فضای واقعی برای توزیع فضای باقی‌مانده داشته باشد.',

    // ── GridPanel ──
    gridSizeNote: 'روی یک خانه در بالا کلیک کنید تا تعداد ستون/ردیف تنظیم شود. بلوک‌های داخل آن به‌ترتیب خانه‌ها را پر می‌کنند — یک بلوک داخل این گرید را انتخاب کرده و از کنترل "اشغال خانه‌ها" (در تب محتوای خودش) استفاده کنید تا بیش از یک خانه را اشغال کند.',
    gridSizeCaption: (cols: number, rows: number) => `گرید ${cols} × ${rows}`,
    rowHeightLabel: 'ارتفاع ردیف', pxMinLabel: 'پیکسل حداقل',

    // ── TextPanel / HeadingPanel ──
    textFieldLabel: 'متن',
    textTip: 'نکته: برای نوار ابزار کامل قالب‌بندی (بولد، لینک، لیست، ترازبندی…) روی متن در بوم دوبار کلیک کنید',
    dblClickEditText: 'برای ویرایش متن دوبار کلیک کنید…',
    tagLabel: 'تگ',
    headingTip: 'نکته: برای نوار ابزار کامل قالب‌بندی روی عنوان در بوم دوبار کلیک کنید',
    dblClickEditHeading: 'برای ویرایش عنوان دوبار کلیک کنید…',

    // ── ImagePanel / ImageEditor ──
    browseMediaBtn: 'مرور کتابخانه رسانه', replaceImageBtn: 'جایگزینی تصویر', editImageBtn: 'ویرایش تصویر',
    urlLabel: 'آدرس (یا لینک را جای‌گذاری کنید)', altTextLabel: 'متن جایگزین (Alt)',
    widthModeFieldLabel: 'حالت عرض', modeFillContainer: 'پر کردن کانتینر',
    imageFixedPxNote: 'پیکسل ثابت این تصویر را در هر کانتینری هم‌اندازه نگه می‌دارد — برای قرار دادن آن در چپ/وسط/راست یک کانتینر عریض‌تر، همراه با موقعیت در پایین استفاده کنید',
    fitLabel: 'تناسب', fitCover: 'پوشش (پر کردن و برش)', fitContain: 'جا دادن کامل (درون قاب)',
    fitFill: 'کشیدن (Fill)', fitNone: 'هیچ (اندازه اصلی)',
    focalPointLabel: 'نقطه کانونی',
    clickChooseImage: 'برای انتخاب تصویر کلیک کنید',

    // ── ButtonPanel ──
    linkTypeLabel: 'نوع', linkTypeRelative: 'نسبی (#anchor، /مسیر)', linkTypeAbsolute: 'مطلق (https://…)',
    linkAbsoluteNote: 'در صورت ننوشتن، https:// به‌طور خودکار اضافه می‌شود.',
    linkRelativeNote: 'دقیقاً همان‌طور که تایپ شده استفاده می‌شود — برای لنگرهای درون‌صفحه‌ای (یک شناسه المان در جای دیگر همین صفحه، مثلاً «#pricing») یا مسیرهای همین سایت (مثلاً «/pricing») مناسب است.',
    openNewTabLabel: 'باز شدن در برگه جدید',
    buttonPositionNote: 'فقط زمانی نمایان می‌شود که کانتینر این بلوک از خودِ دکمه عریض‌تر/بلندتر باشد',

    // ── SpacerPanel / SpacerEditor ──
    heightPxLabel: 'ارتفاع (پیکسل)',
    spacerTip: 'نکته: به‌جای این کار، دستگیره پایین را روی بوم بکشید',
    spacerCanvasLabel: (h: number) => `فاصله‌گذار ${h}px`,

    // ── DividerPanel ──
    dividerPositionNote: 'فقط زمانی جلوه قابل مشاهده دارد که عرض/ارتفاع این خط جداکننده کوچک‌تر از کانتینرش تنظیم شده باشد',

    // ── FormPanel / field panels (formNodes.tsx) ──
    formNoDestinationWarning: 'مقصدی تنظیم نشده — یک آدرس در تب محتوا اضافه کنید تا ارسال‌ها واقعاً جایی بروند.',
    formDestinationSection: 'مقصد',
    formActionLabel: 'ارسال داده‌ها به (آدرس)',
    formActionNote: 'محلی که داده‌های فرم هنگام ارسال به آن فرستاده می‌شود — مثلاً یک endpoint در Formspree/Getform، یک وب‌هوک Zapier، یا مسیر API خودتان.',
    formMethodLabel: 'متد',
    formSubmitAsJsonLabel: 'ارسال به‌صورت JSON',
    formSubmitAsJsonNote: 'در حالت خاموش، داده‌های فرم به شکل معمول ارسال می‌شود (با اکثر سرویس‌های فرم به‌طور پیش‌فرض کار می‌کند). در حالت روشن، به‌جای آن یک بدنهٔ JSON ارسال می‌شود — فقط زمانی از این استفاده کنید که endpoint شما دقیقاً JSON می‌خواهد.',
    formMessagesSection: 'پیام‌ها',
    formSuccessMessageLabel: 'پیام موفقیت',
    formErrorMessageLabel: 'پیام خطا',
    formLabelFieldLabel: 'برچسب فیلد',
    formPlaceholderLabel: 'متن جایگزین',
    formFieldTypeLabel: 'نوع فیلد',
    formRequiredLabel: 'الزامی',
    formFieldNameSection: 'نام فیلد',
    formFieldNameNote: 'کلیدی که این فیلد با آن ارسال می‌شود (مثلاً «email»). فقط حروف، اعداد، خط تیره و زیرخط.',
    formRowsLabel: 'تعداد ردیف',
    formOptionsSection: 'گزینه‌ها',
    formAddOptionBtn: '+ افزودن گزینه',
  },
} as const

export type DictKey = keyof typeof DICT['en']

export function t(locale: Locale, key: DictKey, ...args: any[]): string {
  const table = DICT[locale] ?? DICT.en
  const entry = (table as any)[key] ?? (DICT.en as any)[key]
  return typeof entry === 'function' ? entry(...args) : entry
}

// React hook version — reads locale from the store so callers don't each
// need their own useBuilderStore(s => s.locale) subscription. Re-renders
// automatically whenever the locale changes, same as any other store value.
export function useT() {
  const locale = useBuilderStore(s => s.locale)
  return (key: DictKey, ...args: any[]) => t(locale, key, ...args)
}

// ─── Node display names ─────────────────────────────────────────────────────
// Deliberately kept SEPARATE from NODE_REGISTRY's own `label` field rather
// than editing registry.tsx directly — `label` stays English-only there
// (it's what registry.test.ts asserts on, and doubles as the fallback
// here). Call sites that show a node's name to the user (BlockPicker,
// LayersTab) should call nodeLabel(locale, type, def.label) instead of
// reading def.label directly.
const NODE_LABELS_FA: Partial<Record<NodeType, string>> = {
  section: 'بخش', columns: 'ستون‌ها', column: 'ستون', grid: 'شبکه',
  tabs: 'تب‌ها', tabpane: 'تب', carousel: 'کاروسل', slide: 'اسلاید',
  text: 'متن', heading: 'عنوان', image: 'تصویر', button: 'دکمه',
  spacer: 'فاصله‌گذار', divider: 'خط جداکننده',
  list: 'لیست', badge: 'برچسب', avatar: 'آواتار', quote: 'نقل‌قول',
  video: 'ویدیو', accordion: 'آکاردئون',
  form: 'فرم', formInput: 'فیلد متنی', formTextarea: 'ناحیه متنی',
  formSelect: 'منوی کشویی', formCheckbox: 'چک‌باکس', formSubmit: 'دکمه ارسال',
}

export function nodeLabel(locale: Locale, type: NodeType, fallbackEnglishLabel: string): string {
  if (locale === 'fa') return NODE_LABELS_FA[type] ?? fallbackEnglishLabel
  return fallbackEnglishLabel
}

// ─── Block-group display names ──────────────────────────────────────────────
// BLOCK_GROUPS in registry.tsx (Layout / Content / Elements / Form) are plain
// English section headers, same situation as NODE_REGISTRY's `label` above
// — kept English there on purpose, translated only at the display call
// site via this map, so registry.tsx doesn't need a locale import.
const BLOCK_GROUP_LABELS_FA: Record<string, string> = {
  Layout: 'چیدمان',
  Content: 'محتوا',
  Elements: 'عناصر',
  Form: 'فرم',
}

export function blockGroupLabel(locale: Locale, groupLabel: string): string {
  if (locale === 'fa') return BLOCK_GROUP_LABELS_FA[groupLabel] ?? groupLabel
  return groupLabel
}