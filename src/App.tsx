import { useEffect, useRef, useState } from 'react'

type TimerMode = 'focus' | 'shortBreak' | 'longBreak'
type TimerStatus = 'idle' | 'running' | 'paused'
type Locale = 'ja' | 'en'

type Settings = {
  focusDuration: 25 | 50
  shortBreakDuration: number
  longBreakDuration: number
  soundEnabled: boolean
  noMercyMode: boolean
}

type SessionLog = {
  mode: TimerMode
  durationMin: number
  completedAt: string
}

type SeoCopy = {
  title: string
  description: string
  keywords: string
  ogLocale: 'ja_JP' | 'en_US'
}

const STORAGE_KEYS = {
  settings: 'stoic-pomodoro-settings',
  sessions: 'stoic-pomodoro-sessions',
  streak: 'stoic-pomodoro-streak',
  lastStudyDate: 'stoic-pomodoro-last-study-date',
  locale: 'stoic-pomodoro-locale',
}

const STOIC_QUOTES = [
  {
    text: {
      ja: '制御できることに集中し、できないことは切り捨てる。',
      en: 'Control what you can. Cut away what you cannot.',
    },
    author: {
      ja: 'エピクテトス',
      en: 'Epictetus',
    },
  },
  {
    text: {
      ja: '規律とは、楽なことより大事なことを選ぶことだ。',
      en: 'Discipline is choosing what matters over what is easy.',
    },
    author: {
      ja: 'ストア派の原則',
      en: 'Stoic Rule',
    },
  },
  {
    text: {
      ja: '障害そのものが訓練になる。',
      en: 'The obstacle is the training.',
    },
    author: {
      ja: 'マルクス・アウレリウス',
      en: 'Marcus Aurelius',
    },
  },
  {
    text: {
      ja: '気分より先に学習、迷いより先に行動。',
      en: 'Study before mood. Action before doubt.',
    },
    author: {
      ja: '実践メモ',
      en: 'Practice Note',
    },
  },
  {
    text: {
      ja: '今日の厳しい一回が、明日の落ち着いた自分を作る。',
      en: 'A hard session today is a calmer self tomorrow.',
    },
    author: {
      ja: 'デイリーリマインダー',
      en: 'Daily Reminder',
    },
  },
  {
    text: {
      ja: '気の散りと交渉しない。',
      en: 'Do not negotiate with distraction.',
    },
    author: {
      ja: '集中の原則',
      en: 'Focus Principle',
    },
  },
] as const

const DEFAULT_SETTINGS: Settings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  soundEnabled: true,
  noMercyMode: false,
}

const MODE_META: Record<
  TimerMode,
  {
    label: Record<Locale, string>
    shortLabel: string
    accent: string
    surface: string
  }
> = {
  focus: {
    label: { ja: '集中', en: 'Focus' },
    shortLabel: 'FOCUS',
    accent: '#d46a1e',
    surface: 'rgba(212, 106, 30, 0.16)',
  },
  shortBreak: {
    label: { ja: '短休憩', en: 'Short Break' },
    shortLabel: 'BREAK',
    accent: '#4f8f56',
    surface: 'rgba(79, 143, 86, 0.16)',
  },
  longBreak: {
    label: { ja: '長休憩', en: 'Long Break' },
    shortLabel: 'RESET',
    accent: '#40688f',
    surface: 'rgba(64, 104, 143, 0.16)',
  },
}

const COPY = {
  ja: {
    eyebrow: 'Stoic Learning Timer',
    heroTitle: '規律を積み上げるポモドーロ。',
    todayLog: '今日のログ',
    settings: '設定',
    timerModeAria: 'タイマーモード選択',
    cycleLabel: (current: number, total: number) => `サイクル ${current} / ${total}`,
    cycleProgressAria: '現在の集中サイクル進捗',
    reset: 'リセット',
    pause: '一時停止',
    resume: '再開',
    start: '開始',
    skip: 'スキップ',
    soundOn: '通知音 オン',
    soundOff: '通知音 オフ',
    noMercyOn: 'ノーマーシー オン',
    noMercyOff: 'ノーマーシー オフ',
    state: '状態',
    status: {
      idle: '待機',
      running: '実行中',
      paused: '停止中',
    },
    metrics: {
      focusToday: '今日の集中',
      completedSessions: '完了セッション数',
      deepMinutes: '集中分数',
      minutesInvested: '積み上げた分数',
      streak: '継続日数',
      studyDays: '学習日数',
      discipline: '規律スコア',
      outOfHundred: '100 点換算',
    },
    dailyDoctrine: '今日の言葉',
    protocol: 'ルール',
    edit: '編集',
    protocolItems: {
      focusLength: (value: number) => `集中時間: ${value} 分`,
      shortBreak: (value: number) => `短休憩: ${value} 分`,
      longBreak: (value: number) => `長休憩: ${value} 分`,
      noMercyMode: (enabled: boolean) => `ノーマーシー: ${enabled ? '有効' : '無効'}`,
    },
    settingsAria: 'タイマー設定',
    close: '閉じる',
    focusMinutes: (value: number) => `${value} 分集中`,
    shortBreakMinutes: (value: number) => `短休憩: ${value} 分`,
    longBreakMinutes: (value: number) => `長休憩: ${value} 分`,
    completionSound: '完了通知音',
    completionSoundHelp: 'セッション終了時に短い通知音を鳴らす。',
    noMercyModeTitle: 'ノーマーシーモード',
    noMercyModeHelp: 'タイマー実行中の一時停止を無効にする。',
    logAria: '今日のセッションログ',
    noSessions: 'まだ完了したセッションはありません。',
    minutesSuffix: '分',
    localeLabel: '表示言語',
  },
  en: {
    eyebrow: 'Stoic Learning Timer',
    heroTitle: 'Build discipline, one session at a time.',
    todayLog: 'Today Log',
    settings: 'Settings',
    timerModeAria: 'Timer mode selection',
    cycleLabel: (current: number, total: number) => `Cycle ${current} / ${total}`,
    cycleProgressAria: 'Current focus cycle progress',
    reset: 'Reset',
    pause: 'Pause',
    resume: 'Resume',
    start: 'Start',
    skip: 'Skip',
    soundOn: 'Sound On',
    soundOff: 'Sound Off',
    noMercyOn: 'No Mercy On',
    noMercyOff: 'No Mercy Off',
    state: 'State',
    status: {
      idle: 'Idle',
      running: 'Running',
      paused: 'Paused',
    },
    metrics: {
      focusToday: 'Focus today',
      completedSessions: 'completed sessions',
      deepMinutes: 'Deep minutes',
      minutesInvested: 'minutes invested',
      streak: 'Streak',
      studyDays: 'study days',
      discipline: 'Discipline',
      outOfHundred: 'out of 100',
    },
    dailyDoctrine: 'Daily Doctrine',
    protocol: 'Protocol',
    edit: 'Edit',
    protocolItems: {
      focusLength: (value: number) => `Focus length: ${value} min`,
      shortBreak: (value: number) => `Short break: ${value} min`,
      longBreak: (value: number) => `Long break: ${value} min`,
      noMercyMode: (enabled: boolean) => `No mercy mode: ${enabled ? 'enabled' : 'disabled'}`,
    },
    settingsAria: 'Timer settings',
    close: 'Close',
    focusMinutes: (value: number) => `${value} min focus`,
    shortBreakMinutes: (value: number) => `Short break: ${value} min`,
    longBreakMinutes: (value: number) => `Long break: ${value} min`,
    completionSound: 'Completion sound',
    completionSoundHelp: 'Play a short cue when a session ends.',
    noMercyModeTitle: 'No mercy mode',
    noMercyModeHelp: 'Disable pause while the timer is running.',
    logAria: 'Today session log',
    noSessions: 'No sessions completed yet.',
    minutesSuffix: 'min',
    localeLabel: 'Language',
  },
} as const

const CYCLE_LENGTH = 4
const BASE_URL = 'https://matsufuji06.github.io/stoicLearningTimer/'

const SEO_COPY: Record<Locale, SeoCopy> = {
  ja: {
    title: 'ストイック学習タイマー | ポモドーロで集中力を高める',
    description:
      'ストイック学習タイマーは、ポモドーロ法で集中と休憩を最適化する無料の学習タイマーです。勉強・資格学習・在宅ワークの集中力維持に役立ちます。',
    keywords:
      'ポモドーロタイマー,学習タイマー,勉強 タイマー,集中力,作業効率,ストイック,study timer,pomodoro timer',
    ogLocale: 'ja_JP',
  },
  en: {
    title: 'Stoic Learning Timer | Free Pomodoro Study Timer',
    description:
      'Stoic Learning Timer is a free Pomodoro study timer for deep work, exam prep, and consistent learning habits in English and Japanese.',
    keywords:
      'pomodoro timer,study timer,focus timer,deep work timer,learning productivity,exam study timer,bilingual timer',
    ogLocale: 'en_US',
  },
}

function getTodayStamp(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function getPreviousDayStamp(date = new Date()) {
  const previous = new Date(date)
  previous.setDate(previous.getDate() - 1)
  return getTodayStamp(previous)
}

function formatTime(value: number) {
  const mins = Math.floor(value / 60)
  const secs = value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setHeadLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`
  let element = document.head.querySelector<HTMLLinkElement>(selector)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    if (hreflang) {
      element.setAttribute('hreflang', hreflang)
    }
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function updateSeoSchema(locale: Locale, targetUrl: string) {
  const description = SEO_COPY[locale].description
  const scriptId = 'seo-schema-webapp'
  let script = document.getElementById(scriptId) as HTMLScriptElement | null

  if (!script) {
    script = document.createElement('script')
    script.id = scriptId
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Stoic Learning Timer',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    inLanguage: ['ja', 'en'],
    description,
    url: targetUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    featureList: [
      'Pomodoro focus and break cycles',
      'Daily session logs',
      'Streak tracking',
      'Bilingual interface',
    ],
  })
}

function getDurationSeconds(mode: TimerMode, settings: Settings) {
  if (mode === 'focus') return settings.focusDuration * 60
  if (mode === 'shortBreak') return settings.shortBreakDuration * 60
  return settings.longBreakDuration * 60
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function beep(kind: TimerMode) {
  try {
    const context = new window.AudioContext()
    const base = kind === 'focus' ? 523.25 : 392
    ;[0, 0.16, 0.32].forEach((offset, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()

      oscillator.type = index === 2 ? 'triangle' : 'sine'
      oscillator.frequency.value = base + index * 87
      oscillator.connect(gain)
      gain.connect(context.destination)

      const start = context.currentTime + offset
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)

      oscillator.start(start)
      oscillator.stop(start + 0.32)
    })
  } catch {
    return
  }
}

function App() {
  const [locale, setLocale] = useState<Locale>(() => {
    const params = new URLSearchParams(window.location.search)
    const queryLocale = params.get('lang')
    if (queryLocale === 'ja' || queryLocale === 'en') {
      return queryLocale
    }

    const stored = localStorage.getItem(STORAGE_KEYS.locale)
    return stored === 'ja' || stored === 'en' ? stored : 'ja'
  })
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = safeParse<Partial<Settings>>(
      localStorage.getItem(STORAGE_KEYS.settings),
      {},
    )
    return { ...DEFAULT_SETTINGS, ...stored }
  })
  const [mode, setMode] = useState<TimerMode>('focus')
  const [status, setStatus] = useState<TimerStatus>('idle')
  const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.focusDuration * 60)
  const [cycleCount, setCycleCount] = useState(0)
  const [focusCompletedToday, setFocusCompletedToday] = useState(0)
  const [streakDays, setStreakDays] = useState(0)
  const [sessionLog, setSessionLog] = useState<SessionLog[]>([])
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [pulse, setPulse] = useState(false)

  const pulseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const allSessions = safeParse<Record<string, SessionLog[]>>(
      localStorage.getItem(STORAGE_KEYS.sessions),
      {},
    )
    const todaySessions = allSessions[getTodayStamp()] ?? []
    const focusCount = todaySessions.filter((entry) => entry.mode === 'focus').length
    const lastStudyDate = localStorage.getItem(STORAGE_KEYS.lastStudyDate)
    const savedStreak = Number(localStorage.getItem(STORAGE_KEYS.streak) ?? '0')
    const today = getTodayStamp()
    const previousDay = getPreviousDayStamp()

    setSessionLog(todaySessions)
    setFocusCompletedToday(focusCount)
    setCycleCount(focusCount % CYCLE_LENGTH)
    setQuoteIndex(Math.floor(Math.random() * STOIC_QUOTES.length))

    if (lastStudyDate === today || lastStudyDate === previousDay) {
      setStreakDays(savedStreak)
    } else {
      setStreakDays(0)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.locale, locale)
    document.documentElement.lang = locale

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('lang', locale)
    window.history.replaceState({}, '', nextUrl)

    const localizedUrl = nextUrl.toString()
    const seo = SEO_COPY[locale]

    document.title = seo.title
    setMetaTag('name', 'description', seo.description)
    setMetaTag('name', 'keywords', seo.keywords)
    setMetaTag('property', 'og:title', seo.title)
    setMetaTag('property', 'og:description', seo.description)
    setMetaTag('property', 'og:locale', seo.ogLocale)
    setMetaTag('property', 'og:url', localizedUrl)
    setMetaTag('name', 'twitter:title', seo.title)
    setMetaTag('name', 'twitter:description', seo.description)

    setHeadLink('canonical', localizedUrl)
    setHeadLink('alternate', `${BASE_URL}?lang=ja`, 'ja')
    setHeadLink('alternate', `${BASE_URL}?lang=en`, 'en')
    setHeadLink('alternate', BASE_URL, 'x-default')

    updateSeoSchema(locale, localizedUrl)
  }, [locale])

  useEffect(() => {
    if (status !== 'running') return undefined

    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [status])

  useEffect(() => {
    if (timeLeft !== 0 || status !== 'running') return
    completeSession()
  }, [timeLeft, status])

  useEffect(() => {
    if (status === 'idle') {
      setTimeLeft(getDurationSeconds(mode, settings))
    }
  }, [mode, settings, status])

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        window.clearTimeout(pulseTimerRef.current)
      }
    }
  }, [])

  function persistSession(nextEntry: SessionLog) {
    const allSessions = safeParse<Record<string, SessionLog[]>>(
      localStorage.getItem(STORAGE_KEYS.sessions),
      {},
    )
    const today = getTodayStamp()
    const nextSessions = [nextEntry, ...(allSessions[today] ?? [])].slice(0, 20)
    const nextStore = { ...allSessions, [today]: nextSessions }

    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(nextStore))
    setSessionLog(nextSessions)
  }

  function updateStreak() {
    const today = getTodayStamp()
    const previousDay = getPreviousDayStamp()
    const lastStudyDate = localStorage.getItem(STORAGE_KEYS.lastStudyDate)

    if (lastStudyDate === today) return streakDays

    const nextStreak = lastStudyDate === previousDay ? streakDays + 1 : 1
    localStorage.setItem(STORAGE_KEYS.streak, String(nextStreak))
    localStorage.setItem(STORAGE_KEYS.lastStudyDate, today)
    setStreakDays(nextStreak)
    return nextStreak
  }

  function triggerPulse() {
    setPulse(true)
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current)
    }
    pulseTimerRef.current = window.setTimeout(() => setPulse(false), 700)
  }

  function completeSession(options: { recordProgress?: boolean; autoStartNext?: boolean } = {}) {
    const shouldRecordProgress = options.recordProgress ?? true
    const autoStartNext = options.autoStartNext ?? true
    const completedMode = mode
    const completedDuration = Math.round(getDurationSeconds(completedMode, settings) / 60)

    if (shouldRecordProgress) {
      persistSession({
        mode: completedMode,
        durationMin: completedDuration,
        completedAt: new Date().toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    }

    if (settings.soundEnabled) {
      beep(completedMode)
    }

    triggerPulse()

    if (completedMode === 'focus') {
      if (shouldRecordProgress) {
        const nextFocusCount = focusCompletedToday + 1
        setFocusCompletedToday(nextFocusCount)
        setQuoteIndex((current) => (current + 1) % STOIC_QUOTES.length)
        updateStreak()
      }

      const nextCycleCount = (cycleCount + 1) % CYCLE_LENGTH
      const nextMode = nextCycleCount === 0 ? 'longBreak' : 'shortBreak'
      const nextDuration = getDurationSeconds(nextMode, settings)

      setCycleCount(nextCycleCount)
      setMode(nextMode)
      setTimeLeft(nextDuration)
      setStatus(autoStartNext ? 'running' : 'idle')
      return
    }

    const nextMode: TimerMode = 'focus'
    const nextDuration = getDurationSeconds(nextMode, settings)

    setMode(nextMode)
    setTimeLeft(nextDuration)
    setStatus(autoStartNext ? 'running' : 'idle')
  }

  function switchMode(nextMode: TimerMode) {
    setMode(nextMode)
    setStatus('idle')
    setTimeLeft(getDurationSeconds(nextMode, settings))
  }

  function handlePrimaryAction() {
    if (status === 'running') {
      if (!settings.noMercyMode) {
        setStatus('paused')
      }
      return
    }
    setStatus('running')
  }

  function handleReset() {
    setStatus('idle')
    setTimeLeft(getDurationSeconds(mode, settings))
  }

  function handleSkip() {
    completeSession({ recordProgress: false })
  }

  const totalDuration = getDurationSeconds(mode, settings)
  const progress = totalDuration === 0 ? 0 : timeLeft / totalDuration
  const radius = 126
  const circumference = Math.PI * radius * 2
  const strokeOffset = circumference * (1 - progress)
  const copy = COPY[locale]
  const currentMode = MODE_META[mode]
  const focusMinutesToday = sessionLog
    .filter((entry) => entry.mode === 'focus')
    .reduce((sum, entry) => sum + entry.durationMin, 0)
  const disciplineScore = Math.min(
    100,
    focusCompletedToday * 12 + streakDays * 7 + (settings.noMercyMode ? 9 : 0),
  )
  const quote = STOIC_QUOTES[quoteIndex]

  return (
    <div
      className="app-shell"
      style={{
        ['--accent' as string]: currentMode.accent,
        ['--accent-surface' as string]: currentMode.surface,
      }}
    >
      <div className="app-background" aria-hidden="true" />

      <header className="topbar">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.heroTitle}</h1>
        </div>
        <div className="topbar-actions">
          <div className="locale-switch" aria-label={copy.localeLabel}>
            {(['ja', 'en'] as const).map((entryLocale) => (
              <button
                key={entryLocale}
                type="button"
                className={`locale-button ${locale === entryLocale ? 'is-active' : ''}`}
                onClick={() => setLocale(entryLocale)}
              >
                {entryLocale.toUpperCase()}
              </button>
            ))}
          </div>
          <button type="button" className="ghost-button" onClick={() => setShowLog(true)}>
            {copy.todayLog}
          </button>
          <button type="button" className="ghost-button" onClick={() => setShowSettings(true)}>
            {copy.settings}
          </button>
        </div>
      </header>

      <main className="layout-grid">
        <section className="hero-panel">
          <div className="mode-tabs" role="tablist" aria-label={copy.timerModeAria}>
            {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map((entryMode) => (
              <button
                key={entryMode}
                type="button"
                className={`mode-tab ${mode === entryMode ? 'is-active' : ''}`}
                onClick={() => switchMode(entryMode)}
              >
                {MODE_META[entryMode].label[locale]}
              </button>
            ))}
          </div>

          <div className={`timer-stage ${pulse ? 'is-pulsing' : ''}`}>
            <svg className="timer-ring" viewBox="0 0 320 320" aria-hidden="true">
              <circle className="timer-track" cx="160" cy="160" r={radius} />
              <circle
                className="timer-progress"
                cx="160"
                cy="160"
                r={radius}
                style={{ strokeDasharray: circumference, strokeDashoffset: strokeOffset }}
              />
            </svg>
            <div className="timer-core">
              <p className="timer-mode">{currentMode.shortLabel}</p>
              <p className="timer-value">{formatTime(timeLeft)}</p>
              <p className="timer-footnote">
                {mode === 'focus'
                  ? copy.cycleLabel(cycleCount + 1, CYCLE_LENGTH)
                  : currentMode.label[locale]}
              </p>
            </div>
          </div>

          <div className="session-progress" aria-label={copy.cycleProgressAria}>
            {Array.from({ length: CYCLE_LENGTH }).map((_, index) => {
              const isDone = index < cycleCount
              const isCurrent = mode === 'focus' && index === cycleCount
              return (
                <span
                  key={index}
                  className={`progress-dot ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
                />
              )
            })}
          </div>

          <div className="control-row">
            <button type="button" className="secondary-button" onClick={handleReset}>
              {copy.reset}
            </button>
            <button
              type="button"
              className={`primary-button ${settings.noMercyMode && status === 'running' ? 'is-locked' : ''}`}
              onClick={handlePrimaryAction}
            >
              {status === 'running'
                ? copy.pause
                : status === 'paused'
                  ? copy.resume
                  : copy.start}
            </button>
            <button type="button" className="secondary-button" onClick={handleSkip}>
              {copy.skip}
            </button>
          </div>

          <div className="inline-flags">
            <span className="chip">{settings.soundEnabled ? copy.soundOn : copy.soundOff}</span>
            <span className="chip">{settings.noMercyMode ? copy.noMercyOn : copy.noMercyOff}</span>
            <span className="chip">{copy.state} {copy.status[status]}</span>
          </div>
        </section>

        <aside className="insights-panel">
          <section className="metric-grid">
            <article className="metric-card">
              <span className="metric-label">{copy.metrics.focusToday}</span>
              <strong>{focusCompletedToday}</strong>
              <span className="metric-subtext">{copy.metrics.completedSessions}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">{copy.metrics.deepMinutes}</span>
              <strong>{focusMinutesToday}</strong>
              <span className="metric-subtext">{copy.metrics.minutesInvested}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">{copy.metrics.streak}</span>
              <strong>{streakDays}</strong>
              <span className="metric-subtext">{copy.metrics.studyDays}</span>
            </article>
            <article className="metric-card">
              <span className="metric-label">{copy.metrics.discipline}</span>
              <strong>{disciplineScore}</strong>
              <span className="metric-subtext">{copy.metrics.outOfHundred}</span>
            </article>
          </section>

          <section className="quote-card">
            <p className="eyebrow">{copy.dailyDoctrine}</p>
            <blockquote>{quote.text[locale]}</blockquote>
            <p className="quote-author">{quote.author[locale]}</p>
          </section>

          <section className="settings-preview">
            <div className="panel-header">
              <h2>{copy.protocol}</h2>
              <button type="button" className="text-button" onClick={() => setShowSettings(true)}>
                {copy.edit}
              </button>
            </div>
            <ul>
              <li>{copy.protocolItems.focusLength(settings.focusDuration)}</li>
              <li>{copy.protocolItems.shortBreak(settings.shortBreakDuration)}</li>
              <li>{copy.protocolItems.longBreak(settings.longBreakDuration)}</li>
              <li>{copy.protocolItems.noMercyMode(settings.noMercyMode)}</li>
            </ul>
          </section>
        </aside>
      </main>

      <section className="seo-content" aria-label={locale === 'ja' ? 'SEO向け説明' : 'SEO summary'}>
        <h2>
          {locale === 'ja'
            ? 'ポモドーロ学習タイマーで集中習慣をつくる'
            : 'Build a consistent focus habit with a Pomodoro study timer'}
        </h2>
        <p>
          {locale === 'ja'
            ? 'ストイック学習タイマーは、25分・50分の集中モードと休憩モードを切り替えながら、学習や作業のリズムを整える無料Webアプリです。'
            : 'Stoic Learning Timer is a free web-based Pomodoro timer with 25 and 50 minute focus sessions, short breaks, and long breaks for deep work.'}
        </p>
        <p>
          {locale === 'ja'
            ? '日次ログ、継続日数、規律スコアを可視化し、資格勉強・受験対策・プログラミング学習・リモートワークの集中力維持をサポートします。'
            : 'It helps students and professionals stay consistent with daily logs, streak tracking, and discipline score metrics for exams, coding, and remote work.'}
        </p>
        <h3>{locale === 'ja' ? '主な機能' : 'Key features'}</h3>
        <ul>
          <li>
            {locale === 'ja'
              ? 'ポモドーロサイクル（集中・短休憩・長休憩）'
              : 'Pomodoro cycle control (focus, short break, long break)'}
          </li>
          <li>
            {locale === 'ja'
              ? '日本語・英語のバイリンガル表示'
              : 'Bilingual UI in Japanese and English'}
          </li>
          <li>
            {locale === 'ja'
              ? '学習ログ、継続日数、日次振り返り'
              : 'Session logs, streak history, and daily review signals'}
          </li>
        </ul>
      </section>

      {(showSettings || showLog) && (
        <div
          className="overlay"
          onClick={() => {
            setShowSettings(false)
            setShowLog(false)
          }}
        />
      )}

      {showSettings && (
        <section className="drawer" aria-label={copy.settingsAria}>
          <div className="panel-header">
            <h2>{copy.settings}</h2>
            <button type="button" className="text-button" onClick={() => setShowSettings(false)}>
              {copy.close}
            </button>
          </div>

          <div className="setting-stack">
            <div className="segmented-control">
              {[25, 50].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={settings.focusDuration === value ? 'is-active' : ''}
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      focusDuration: value as 25 | 50,
                    }))
                  }
                >
                  {copy.focusMinutes(value)}
                </button>
              ))}
            </div>

            <label className="range-field">
              <span>{copy.shortBreakMinutes(settings.shortBreakDuration)}</span>
              <input
                type="range"
                min="1"
                max="15"
                value={settings.shortBreakDuration}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    shortBreakDuration: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="range-field">
              <span>{copy.longBreakMinutes(settings.longBreakDuration)}</span>
              <input
                type="range"
                min="10"
                max="30"
                value={settings.longBreakDuration}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    longBreakDuration: Number(event.target.value),
                  }))
                }
              />
            </label>

            <button
              type="button"
              className="toggle-row"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  soundEnabled: !current.soundEnabled,
                }))
              }
            >
              <span>
                <strong>{copy.completionSound}</strong>
                <small>{copy.completionSoundHelp}</small>
              </span>
              <span className={`switch ${settings.soundEnabled ? 'is-on' : ''}`} />
            </button>

            <button
              type="button"
              className="toggle-row"
              onClick={() =>
                setSettings((current) => ({
                  ...current,
                  noMercyMode: !current.noMercyMode,
                }))
              }
            >
              <span>
                <strong>{copy.noMercyModeTitle}</strong>
                <small>{copy.noMercyModeHelp}</small>
              </span>
              <span className={`switch ${settings.noMercyMode ? 'is-on danger' : ''}`} />
            </button>
          </div>
        </section>
      )}

      {showLog && (
        <section className="drawer" aria-label={copy.logAria}>
          <div className="panel-header">
            <h2>{copy.todayLog}</h2>
            <button type="button" className="text-button" onClick={() => setShowLog(false)}>
              {copy.close}
            </button>
          </div>

          {sessionLog.length === 0 ? (
            <p className="empty-state">{copy.noSessions}</p>
          ) : (
            <ul className="log-list">
              {sessionLog.map((entry, index) => (
                <li key={`${entry.completedAt}-${index}`}>
                  <span
                    className="log-badge"
                    style={{
                      backgroundColor: MODE_META[entry.mode].surface,
                      color: MODE_META[entry.mode].accent,
                    }}
                  >
                    {MODE_META[entry.mode].label[locale]}
                  </span>
                  <span>{entry.durationMin} {copy.minutesSuffix}</span>
                  <span>{entry.completedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

export default App
