'use client'

import React from 'react'
import { useBuilderStore } from './store'

// Shown before ANYTHING else, the very first time someone opens the
// builder (gated by hasSeenTutorial — see the doc comment in store.ts and
// the hydrate effect in Tutorial.tsx), and again whenever "Restart tutorial"
// is clicked in TopBar. Deliberately bilingual in its own markup rather than
// reading strings from useT()/useTutorialT() — at this exact moment `locale`
// hasn't been chosen yet, so there's no single language to render captions
// in; showing both at once is the answer, not picking one to guess with.
export function LanguageChoiceModal() {
  const open                   = useBuilderStore(s => s.tutorialLangModalOpen)
  const chooseTutorialLanguage = useBuilderStore(s => s.chooseTutorialLanguage)
  const skipTutorial           = useBuilderStore(s => s.skipTutorial)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-violet-100 flex items-center justify-center text-xl">
            🌐
          </div>
          <p className="text-base font-semibold text-neutral-800">
            Choose your language
          </p>
          <p className="text-sm text-neutral-800 mt-0.5" dir="rtl">
            زبان خود را انتخاب کنید
          </p>
          <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
            This sets the app's language and starts a short guided tour.
            <br />
            <span dir="rtl">این زبان برنامه را تنظیم کرده و یک آموزش کوتاه را شروع می‌کند.</span>
          </p>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button
            type="button"
            onClick={() => chooseTutorialLanguage('en')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group"
          >
            <span className="text-sm font-medium text-neutral-700 group-hover:text-violet-700">English</span>
            <span className="text-lg">🇬🇧</span>
          </button>
          <button
            type="button"
            onClick={() => chooseTutorialLanguage('fa')}
            dir="rtl"
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-200 hover:border-violet-400 hover:bg-violet-50 transition-colors group"
          >
            <span className="text-sm font-medium text-neutral-700 group-hover:text-violet-700">فارسی</span>
            <span className="text-lg">🇮🇷</span>
          </button>
        </div>

        <button
          type="button"
          onClick={skipTutorial}
          className="w-full text-center text-xs font-medium text-neutral-400 hover:text-neutral-600 py-3 border-t border-neutral-100 transition-colors"
        >
          Skip for now · فعلاً رد کن
        </button>
      </div>
    </div>
  )
}