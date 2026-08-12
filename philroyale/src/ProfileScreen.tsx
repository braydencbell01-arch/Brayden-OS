import { useMemo, useState } from 'react'
import { CHARACTERS } from './characters'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { playerLevelFromXp } from './clubMeta'
import {
  formatAccountCode,
  loadAccountCode,
  loadAvatarId,
  loadCardProgress,
  loadPlayerName,
  loadProfile,
  saveAvatarId,
  savePlayerName,
} from './storage'

type Props = {
  onOpenSocial?: () => void
}

export function ProfileScreen({ onOpenSocial }: Props) {
  const [name, setName] = useState(() => loadPlayerName())
  const [avatarId, setAvatarId] = useState(() => loadAvatarId())
  const profile = useMemo(() => loadProfile(), [avatarId, name])
  const progress = useMemo(() => loadCardProgress(), [])
  const code = useMemo(() => loadAccountCode(), [])
  const level = playerLevelFromXp(profile.xp)
  const unlocked = useMemo(
    () => CHARACTERS.filter((c) => progress.unlocked.includes(c.id)),
    [progress],
  )

  function persistName(v: string) {
    setName(v)
    savePlayerName(v)
  }

  function pickAvatar(id: string) {
    saveAvatarId(id)
    setAvatarId(id)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#140e0a]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 40% at 50% 0%, #2f6fbf55 0%, transparent 55%),
            linear-gradient(180deg, #1a2a40 0%, #140e0a 50%)
          `,
        }}
      />

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-[max(3.2rem,calc(env(safe-area-inset-top)+2.6rem))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Profile
        </h1>

        <section
          className="mt-3 flex items-center gap-3 rounded-xl p-3"
          style={{
            background: 'linear-gradient(180deg,#3a2418,#1a100c)',
            boxShadow: 'inset 0 1px 0 #c9a22744, 0 6px 16px #00000055',
          }}
        >
          <div
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"
            style={{ background: CARD_PORTRAIT_BG, boxShadow: '0 3px 0 #00000066' }}
          >
            <CharacterModel charId={avatarId} anim="idle" facing={-Math.PI / 2} portrait />
          </div>
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => persistName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full rounded-lg bg-[#140e0a] px-2.5 py-1.5 text-base font-extrabold text-white outline-none ring-1 ring-white/15"
            />
            <p className="mt-1 text-sm font-bold text-white/80">
              {profile.trophies} trophies · Peak {profile.peakTrophies}
            </p>
            <p className="text-xs font-extrabold text-[#f5d76e]/85">
              Level {level.level} · Friend code {formatAccountCode(code)}
            </p>
          </div>
        </section>

        <section className="mt-4">
          <p className="mb-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-white/75">
            Choose avatar
          </p>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {unlocked.map((c) => {
              const active = c.id === avatarId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickAvatar(c.id)}
                    className="w-full overflow-hidden rounded-lg p-0.5"
                    style={{
                      background: active
                        ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                        : '#2a1a12',
                      boxShadow: active ? '0 3px 0 #8a6a12' : 'none',
                    }}
                    aria-label={c.name}
                  >
                    <div
                      className="aspect-square overflow-hidden rounded-md"
                      style={{ background: CARD_PORTRAIT_BG, opacity: 1 }}
                    >
                      <CharacterModel
                        charId={c.id}
                        anim="idle"
                        facing={-Math.PI / 2}
                        portrait
                      />
                    </div>
                    <p className="truncate px-0.5 py-0.5 text-center text-[0.55rem] font-extrabold text-white">
                      {c.name}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {onOpenSocial ? (
          <button
            type="button"
            onClick={onOpenSocial}
            className="mt-5 w-full rounded-xl py-3 text-sm font-extrabold text-white"
            style={{
              background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
              boxShadow: '0 4px 0 #1d4a86',
            }}
          >
            Friends & Club
          </button>
        ) : null}
      </main>
    </div>
  )
}
