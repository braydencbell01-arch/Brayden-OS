import { useMemo, useState } from 'react'
import { CHARACTERS } from './characters'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { playerLevelFromXp } from './clubMeta'
import {
  EMOTE_CATALOG,
  MAX_ACTIVE_EMOTES,
  PHIL_EMOTE_SRC,
  type EmoteDef,
} from './emoteCatalog'
import {
  formatAccountCode,
  loadAccountCode,
  loadActiveEmotes,
  loadAvatarId,
  loadCardProgress,
  loadOwnedEmotes,
  loadPlayerName,
  loadProfile,
  saveAvatarId,
  savePlayerName,
  toggleActiveEmote,
} from './storage'

type Props = {
  onOpenSocial?: () => void
}

function EmoteThumb({ emote }: { emote: EmoteDef }) {
  if (emote.kind === 'phil') {
    return <img src={PHIL_EMOTE_SRC} alt="" className="h-full w-full object-contain" />
  }
  if (emote.kind === 'photo' && emote.src) {
    return <img src={emote.src} alt="" className="h-full w-full object-cover" />
  }
  if (emote.kind === 'character' && emote.charId) {
    return (
      <div className="h-full w-full scale-110">
        <CharacterModel charId={emote.charId} anim="idle" facing={1} portrait />
      </div>
    )
  }
  return <span className="text-2xl leading-none">{emote.emoji}</span>
}

export function ProfileScreen({ onOpenSocial }: Props) {
  const [name, setName] = useState(() => loadPlayerName())
  const [avatarId, setAvatarId] = useState(() => loadAvatarId())
  const [owned, setOwned] = useState(() => loadOwnedEmotes())
  const [active, setActive] = useState(() => loadActiveEmotes())
  const [emoteMsg, setEmoteMsg] = useState<string | null>(null)
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

  function onToggleEmote(id: string) {
    const res = toggleActiveEmote(id)
    setOwned(loadOwnedEmotes())
    setActive(res.active)
    setEmoteMsg(res.message)
    window.setTimeout(() => setEmoteMsg(null), 1800)
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

      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-[max(3.4rem,calc(env(safe-area-inset-top)+2.85rem))]">
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
              const isActive = c.id === avatarId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pickAvatar(c.id)}
                    className="relative h-16 w-full overflow-hidden rounded-xl"
                    style={{
                      background: CARD_PORTRAIT_BG,
                      boxShadow: isActive
                        ? '0 0 0 2px #f5d76e, 0 3px 0 #00000066'
                        : '0 3px 0 #00000066',
                    }}
                    aria-label={c.name}
                  >
                    <CharacterModel charId={c.id} anim="idle" facing={-Math.PI / 2} portrait />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-[0.7rem] font-extrabold uppercase tracking-wide text-white/75">
                Battle emotes
              </p>
              <p className="text-xs font-semibold text-white/55">
                Active {active.length}/{MAX_ACTIVE_EMOTES} · tap to toggle
              </p>
            </div>
            {emoteMsg ? (
              <p className="text-[0.65rem] font-bold text-[#7dff9a]">{emoteMsg}</p>
            ) : null}
          </div>
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {EMOTE_CATALOG.map((emote) => {
              const has = owned.includes(emote.id)
              const on = active.includes(emote.id)
              return (
                <li key={emote.id}>
                  <button
                    type="button"
                    disabled={!has}
                    onClick={() => onToggleEmote(emote.id)}
                    className="flex w-full flex-col items-center gap-1 disabled:opacity-40"
                    aria-label={`${emote.label}${on ? ' active' : ''}`}
                  >
                    <div
                      className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white"
                      style={{
                        boxShadow: on
                          ? '0 0 0 2px #f5d76e, 0 3px 0 #00000066'
                          : '0 3px 0 #00000066',
                      }}
                    >
                      <EmoteThumb emote={emote} />
                      {on ? (
                        <span className="absolute bottom-0.5 right-0.5 rounded bg-[#1e9a4a] px-1 text-[0.5rem] font-black text-white">
                          ON
                        </span>
                      ) : null}
                      {!has ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-black text-white">
                          🔒
                        </span>
                      ) : null}
                    </div>
                    <span className="truncate text-[0.55rem] font-bold text-white/70">
                      {emote.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[0.65rem] font-semibold text-white/45">
            Emoji emotes unlock free. Character & photo emotes come from Emote Market, chests, and
            Trophy Road.
          </p>
        </section>

        {onOpenSocial ? (
          <button
            type="button"
            onClick={onOpenSocial}
            className="mt-5 w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
            style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
          >
            Friends & Club
          </button>
        ) : null}
      </main>
    </div>
  )
}
