import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  clearSettings,
  loadSettings,
  saveSettings,
  type AppSettings,
} from '../lib/settings'
import { LEAGUES, type LeagueId } from '../lib/leagues'

export function SettingsScreen({
  onBack,
  onOpenOnboarding,
  reduce,
}: {
  onBack: () => void
  onOpenOnboarding: () => void
  reduce: boolean | null
}) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const patch = (next: Partial<AppSettings>) => {
    setSettings(saveSettings(next))
  }

  return (
    <div className="relative min-h-dvh overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 50% 0%, rgba(20,107,74,0.5), transparent 55%), linear-gradient(180deg, #06261c 0%, #0b3d2e 100%)',
        }}
      />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-5 pb-28 pt-screen md:max-w-xl md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm font-semibold text-mist/70 transition hover:text-lime"
        >
          ← Back
        </button>
        <motion.header
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 mt-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">Preferences</p>
          <h1 className="mt-2 font-display text-5xl tracking-[0.04em] text-cream">Settings</h1>
        </motion.header>

        <section className="mb-4 border border-white/10 bg-white/[0.03] px-4 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/70">Home</h2>
          <label className="mt-3 flex items-center justify-between gap-3 text-sm text-cream">
            Show match predictions
            <input
              type="checkbox"
              checked={settings.showPredictions}
              onChange={(e) => patch({ showPredictions: e.target.checked })}
            />
          </label>
          <label className="mt-3 flex items-center justify-between gap-3 text-sm text-cream">
            Compact density
            <input
              type="checkbox"
              checked={settings.density === 'compact'}
              onChange={(e) =>
                patch({ density: e.target.checked ? 'compact' : 'comfortable' })
              }
            />
          </label>
          <label className="mt-3 block text-sm text-cream">
            Preferred league
            <select
              className="mt-1 w-full rounded-lg border border-white/15 bg-pitch px-3 py-2 text-sm text-cream"
              value={settings.preferredLeagueId ?? ''}
              onChange={(e) =>
                patch({ preferredLeagueId: e.target.value || null })
              }
            >
              <option value="">None</option>
              {LEAGUES.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="mb-4 border border-white/10 bg-white/[0.03] px-4 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/70">
            Notifications
          </h2>
          <p className="mt-2 text-sm text-mist/70">
            Browser push for goals and kickoffs needs a notification worker (coming next). Toggle
            saves your preference for when it ships.
          </p>
          <label className="mt-3 flex items-center justify-between gap-3 text-sm text-cream">
            Enable when available
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => patch({ notificationsEnabled: e.target.checked })}
            />
          </label>
        </section>

        <section className="mb-4 border border-white/10 bg-white/[0.03] px-4 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist/70">Setup</h2>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="mt-3 rounded-full border border-lime/45 bg-lime/15 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-lime"
          >
            Replay onboarding
          </button>
          <button
            type="button"
            onClick={() => {
              clearSettings()
              setSettings(loadSettings())
            }}
            className="mt-3 ml-2 rounded-full border border-white/15 px-4 py-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-mist"
          >
            Reset settings
          </button>
        </section>

        <p className="text-xs text-mist/50">
          BrayStats covers {LEAGUES.length} competitions. Fantasy sync stays on-device + optional
          cloud invite.
        </p>
      </div>
    </div>
  )
}

export function OnboardingOverlay({
  onDone,
  onPickLeague,
}: {
  onDone: () => void
  onPickLeague: (id: LeagueId) => void
}) {
  const top = LEAGUES.slice(0, 8)

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md border border-white/15 bg-pitch-deep p-5 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime">Welcome</p>
        <h2 className="mt-2 font-display text-4xl tracking-wide text-cream">Make BrayStats yours</h2>
        <p className="mt-2 text-sm text-mist/75">
          Pick a league to follow. You can star more clubs and players anytime.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {top.map((league) => (
            <button
              key={league.id}
              type="button"
              onClick={() => {
                saveSettings({
                  onboardingDone: true,
                  preferredLeagueId: league.id,
                })
                onPickLeague(league.id)
                onDone()
              }}
              className="border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition hover:border-lime/40"
            >
              <span className="block font-display text-2xl text-cream">{league.name}</span>
              <span className="text-[0.65rem] uppercase tracking-[0.12em] text-mist/60">
                {league.country}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            saveSettings({ onboardingDone: true })
            onDone()
          }}
          className="mt-4 w-full text-center text-sm text-mist/60 hover:text-lime"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
