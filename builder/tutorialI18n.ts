'use client'

// ─── Tutorial-only dictionary ───────────────────────────────────────────────
// Deliberately a SEPARATE dictionary from i18n.ts's own DICT, rather than
// merged into it — the tutorial is an isolated, addable feature, and this
// keeps it a drop-in file with zero edits required to your existing (large)
// i18n.ts. It follows the exact same shape/pattern (locale-keyed object of
// strings and formatter functions, a `useT`-style hook reading `locale` off
// the same store) so it feels identical to use from inside TutorialOverlay/
// LanguageChoiceModal/TopBar's new Restart button.
import { useBuilderStore, type Locale } from './store'

const TUTORIAL_DICT = {
  en: {
    // ── Language choice modal (shown before locale is known — so this
    //    modal's OWN chrome is hardcoded bilingual in the component itself,
    //    not read from here; these keys are for everything AFTER a
    //    language has been picked). ──
    restartLabel: '🎓 Tour',
    restartTitle: 'Restart the guided tour',

    stepCount: (cur: number, total: number) => `Step ${cur} of ${total}`,
    next: 'Next', back: 'Back', skip: 'Skip tour', finish: 'Done',

    welcomeTitle: 'Welcome to the Page Builder 👋',
    welcomeBody: "Here's a quick tour of the main pieces — the canvas, the panel on the right, and the toolbar up top. It only takes a minute, and you can skip it anytime.",

    canvasTitle: 'The canvas',
    canvasBody: 'This is your page. Click any block to select it, drag blocks from the sidebar to add new ones, and drag existing blocks to reorder them.',

    cpTabsTitle: 'The side panel',
    cpTabsBody: 'Whatever you select on the canvas is edited here, across three tabs: Layers (the page tree), Style (spacing, color, typography, effects), and Content (text, links, images — whatever is specific to that block type).',

    cpLayersTitle: 'Layers tab',
    cpLayersBody: 'A tree view of every block on the page, nested the same way they are on the canvas. Click any row to select that block, or hover it to delete it.',

    cpStyleTitle: 'Style tab',
    cpStyleBody: 'Visibility, position, size, padding & margin, background, typography, borders, and effects — all in one place, and all aware of hover states and the breakpoint you\'re currently editing.',

    cpContentTitle: 'Content tab',
    cpContentBody: 'The fields specific to whatever type of block is selected — a button\'s link, an image\'s source, a heading\'s text, and so on.',

    themeSeoTitle: 'Theme & SEO',
    themeSeoBody: 'Theme holds your page-wide color palette and text styles, reusable from any block\'s Style tab. SEO covers the page title, meta description, and social sharing preview.',

    undoRedoTitle: 'Undo & redo',
    undoRedoBody: 'Every edit is tracked, so you can always step backward or forward — same as ⌘Z / ⌘Y on your keyboard.',

    modeSwitchTitle: 'Edit vs. Preview',
    modeSwitchBody: 'Edit mode is where you build. Switch to Preview to see (and interact with) the page the way a visitor actually would — including animations, which never play while editing.',

    breakpointTitle: 'Responsive breakpoints',
    breakpointBody: 'Style Desktop, Tablet, and Mobile independently. Any field you don\'t override at Tablet/Mobile just falls back to the Desktop value.',

    saveMenuTitle: 'Save & export',
    saveMenuBody: 'Save to your browser so nothing is lost on refresh, or export the page as a JSON file (to re-import later) or as standalone HTML.',

    publishTitle: 'Publish',
    publishBody: 'When your page is ready, publish it here.',

    finishTitle: "That's it! 🎉",
    finishBody: 'You\'re ready to start building. You can replay this tour anytime from the Tour button in the top bar.',
  },
  fa: {
    restartLabel: '🎓 آموزش',
    restartTitle: 'شروع دوباره آموزش گام‌به‌گام',

    stepCount: (cur: number, total: number) => `مرحله ${cur} از ${total}`,
    next: 'بعدی', back: 'قبلی', skip: 'رد کردن آموزش', finish: 'پایان',

    welcomeTitle: 'به صفحه‌ساز خوش آمدید 👋',
    welcomeBody: 'در این‌جا یک مرور سریع از بخش‌های اصلی می‌بینید — بوم، پنل سمت راست، و نوار بالا. فقط یک دقیقه طول می‌کشد و هر زمان می‌توانید آن را رد کنید.',

    canvasTitle: 'بوم',
    canvasBody: 'این صفحه شماست. روی هر بلوکی کلیک کنید تا انتخاب شود، بلوک‌ها را از نوار کناری بکشید تا اضافه شوند، و بلوک‌های موجود را بکشید تا ترتیبشان تغییر کند.',

    cpTabsTitle: 'پنل کناری',
    cpTabsBody: 'هر چیزی که روی بوم انتخاب کنید، در اینجا و در سه تب ویرایش می‌شود: لایه‌ها (درخت صفحه)، استایل (فاصله‌گذاری، رنگ، تایپوگرافی، جلوه‌ها) و محتوا (متن، لینک، تصویر — هرچه مخصوص همان نوع بلوک باشد).',

    cpLayersTitle: 'تب لایه‌ها',
    cpLayersBody: 'نمای درختی از تمام بلوک‌های صفحه، دقیقاً با همان تودرتویی روی بوم. روی هر ردیف کلیک کنید تا آن بلوک انتخاب شود، یا با نگه‌داشتن ماوس روی آن، حذفش کنید.',

    cpStyleTitle: 'تب استایل',
    cpStyleBody: 'نمایش، موقعیت، اندازه، فاصله داخلی و بیرونی، پس‌زمینه، تایپوگرافی، حاشیه و جلوه‌ها — همه در یک‌جا، و همه با آگاهی از حالت هاور و اندازه صفحه‌ای که در حال ویرایش آن هستید.',

    cpContentTitle: 'تب محتوا',
    cpContentBody: 'فیلدهای مخصوص همان نوع بلوک انتخاب‌شده — لینک یک دکمه، منبع یک تصویر، متن یک عنوان و مانند آن.',

    themeSeoTitle: 'پوسته و سئو',
    themeSeoBody: 'پوسته شامل پالت رنگ و استایل‌های متنی سراسری صفحه است که از تب استایل هر بلوکی قابل استفاده مجدد است. سئو عنوان صفحه، توضیحات متا و پیش‌نمایش اشتراک‌گذاری اجتماعی را پوشش می‌دهد.',

    undoRedoTitle: 'واگرد و ازنو',
    undoRedoBody: 'هر ویرایشی ثبت می‌شود، پس همیشه می‌توانید یک قدم جلو یا عقب بروید — دقیقاً مانند ⌘Z و ⌘Y روی صفحه‌کلید.',

    modeSwitchTitle: 'ویرایش در برابر پیش‌نمایش',
    modeSwitchBody: 'حالت ویرایش جایی است که صفحه را می‌سازید. به پیش‌نمایش سوییچ کنید تا صفحه را دقیقاً همان‌طور که یک بازدیدکننده می‌بیند مشاهده (و با آن تعامل) کنید — از جمله انیمیشن‌ها، که هرگز هنگام ویرایش پخش نمی‌شوند.',

    breakpointTitle: 'اندازه‌های واکنش‌گرا',
    breakpointBody: 'دسکتاپ، تبلت و موبایل را مستقل از هم استایل دهید. هر فیلدی که در تبلت/موبایل بازنویسی نکنید، به مقدار دسکتاپ بازمی‌گردد.',

    saveMenuTitle: 'ذخیره و خروجی',
    saveMenuBody: 'در مرورگر ذخیره کنید تا با رفرش چیزی از دست نرود، یا صفحه را به‌صورت فایل JSON (برای ورود دوباره بعداً) یا HTML مستقل خروجی بگیرید.',

    publishTitle: 'انتشار',
    publishBody: 'وقتی صفحه آماده شد، از اینجا آن را منتشر کنید.',

    finishTitle: 'همین بود! 🎉',
    finishBody: 'شما آماده شروع ساخت هستید. هر زمان می‌توانید این آموزش را از دکمه آموزش در نوار بالا دوباره اجرا کنید.',
  },
} as const

export type TutorialDictKey = keyof typeof TUTORIAL_DICT['en']

export function tutorialT(locale: Locale, key: TutorialDictKey, ...args: any[]): string {
  const table = TUTORIAL_DICT[locale] ?? TUTORIAL_DICT.en
  const entry = (table as any)[key] ?? (TUTORIAL_DICT.en as any)[key]
  return typeof entry === 'function' ? entry(...args) : entry
}

export function useTutorialT() {
  const locale = useBuilderStore(s => s.locale)
  return (key: TutorialDictKey, ...args: any[]) => tutorialT(locale, key, ...args)
}