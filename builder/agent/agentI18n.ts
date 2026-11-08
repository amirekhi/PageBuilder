'use client'

// Separate dictionary (same pattern as tutorialI18n.ts) so the agent feature
// is a drop-in that doesn't bloat i18n.ts.
import { useBuilderStore, type Locale } from '../store'

const AGENT_DICT = {
  en: {
    title: 'AI page assistant',
    intro: 'Describe the page you want, or ask for changes to the current one. Everything the AI does is a single undo step.',
    placeholderCreate: 'e.g. A landing page for a coffee subscription…',
    placeholderEdit: 'e.g. Make the hero darker and add a FAQ…',
    send: 'Send', stop: 'Stop',
    building: 'AI is building your page…',
    buildingCount: (n: number) => `${n} changes`,
    applied: (n: number) => `${n} change${n === 1 ? '' : 's'} applied`,
    skipped: (n: number) => `${n} skipped`,
    undo: 'Undo AI changes',
    clear: 'Clear chat',
    suggest1: 'A landing page for a coffee subscription',
    suggest2: 'A portfolio page for a photographer',
    suggest3: 'A pricing page with three plans and a FAQ',
    suggestEdit1: 'Make the colors darker',
    suggestEdit2: 'Add a testimonials section',
    suggestEdit3: 'Rewrite the headline to be shorter',
    errNotConfigured: 'The AI isn’t configured yet. Add GEMINI_API_KEY on the server and restart it.',
    errRateLimited: 'Too many requests. Wait a moment and try again.',
    errGeneric: 'Something went wrong. Please try again.',
    errEmpty: 'The AI didn’t return any changes. Try rephrasing your request.',
    stopped: 'Stopped.',
  },
  fa: {
    title: 'دستیار هوشمند صفحه‌ساز',
    intro: 'صفحه‌ای را که می‌خواهید توصیف کنید، یا تغییر در صفحه فعلی را بخواهید. تمام کارهای هوش مصنوعی فقط یک مرحله واگرد است.',
    placeholderCreate: 'مثلاً: صفحه فرود برای اشتراک قهوه…',
    placeholderEdit: 'مثلاً: بخش اول را تیره‌تر کن و سوالات متداول اضافه کن…',
    send: 'ارسال', stop: 'توقف',
    building: 'هوش مصنوعی در حال ساخت صفحه است…',
    buildingCount: (n: number) => `${n} تغییر`,
    applied: (n: number) => `${n} تغییر اعمال شد`,
    skipped: (n: number) => `${n} مورد رد شد`,
    undo: 'واگرد تغییرات هوش مصنوعی',
    clear: 'پاک کردن گفتگو',
    suggest1: 'صفحه فرود برای اشتراک قهوه',
    suggest2: 'صفحه نمونه‌کار برای یک عکاس',
    suggest3: 'صفحه قیمت‌گذاری با سه پلن و سوالات متداول',
    suggestEdit1: 'رنگ‌ها را تیره‌تر کن',
    suggestEdit2: 'یک بخش نظرات مشتریان اضافه کن',
    suggestEdit3: 'تیتر را کوتاه‌تر بنویس',
    errNotConfigured: 'هوش مصنوعی هنوز پیکربندی نشده است. GEMINI_API_KEY را در سرور اضافه و سرور را دوباره اجرا کنید.',
    errRateLimited: 'درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.',
    errGeneric: 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
    errEmpty: 'هوش مصنوعی هیچ تغییری برنگرداند. درخواست را بازنویسی کنید.',
    stopped: 'متوقف شد.',
  },
} as const

export type AgentDictKey = keyof typeof AGENT_DICT['en']

export function agentT(locale: Locale, key: AgentDictKey, ...args: any[]): string {
  const table = AGENT_DICT[locale] ?? AGENT_DICT.en
  const entry = (table as any)[key] ?? (AGENT_DICT.en as any)[key]
  return typeof entry === 'function' ? entry(...args) : entry
}

export function useAgentT() {
  const locale = useBuilderStore(s => s.locale)
  return (key: AgentDictKey, ...args: any[]) => agentT(locale, key, ...args)
}
