import { useCallback, useEffect, useMemo, useState } from 'react'
import { CHARACTERS } from './characters'
import { CharacterModel } from './characters/CharacterModel'
import { CARD_PORTRAIT_BG } from './characters/cardArt'
import { FRAME_CATALOG, TITLE_CATALOG, getTitle, titleColor } from './cosmeticsCatalog'
import { FramePreview, NameWithTitle, ProfileChip } from './ProfileChip'
import { playerLevelFromXp } from './clubMeta'
import {
  EMOTE_CATALOG,
  MAX_ACTIVE_EMOTES,
  PHIL_EMOTE_SRC,
  type EmoteDef,
} from './emoteCatalog'
import { mpFetchLeaderboard, mpLastPresence, mpReportLeaderboard, type MpLeaderboardRow } from './mpClient'
import { lookupDirectory, resolvePlayerName } from './socialHub'
import {
  formatAccountCode,
  isPlaceholderFriendName,
  loadAccountCode,
  loadActiveEmotes,
  loadAvatarId,
  loadCardProgress,
  loadCosmetics,
  cosmeticsPayload,
  loadFriends,
  loadOwnedEmotes,
  loadPlayerId,
  loadPlayerName,
  loadProfile,
  loadSeenLeaderboardPlayers,
  noteSeenLeaderboardPlayer,
  preferRealPlayerName,
  leaderboardDisplayName,
  saveAvatarId,
  savePlayerName,
  toggleActiveEmote,
  equipTitle,
  equipFrame,
} from './storage'

type Props = {
  onOpenSocial?: () => void
  onAddByCode?: (code: string) => Promise<{ ok: boolean; message: string }>
  onRequestBattle?: (playerId: string, name: string) => void
}

type BoardRow = {
  code: string
  name: string
  trophies: number
  online: boolean
  inBattle: boolean
  isYou: boolean
  avatarId?: string
  titleId?: string
  frameId?: string
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

function mergeBoard(
  remote: MpLeaderboardRow[],
  myCode: string,
  myName: string,
  myTrophies: number,
  mine: { avatarId?: string; titleId?: string; frameId?: string },
): BoardRow[] {
  const map = new Map<string, BoardRow>()
  const live = mpLastPresence()

  for (const row of remote) {
    const code = String(row.code || '').replace(/\D/g, '').slice(0, 6)
    if (code.length !== 6) continue
    const p = live[code]
    const dir = lookupDirectory(code)
    map.set(code, {
      code,
      name: leaderboardDisplayName(code, row.name, p?.name, dir || undefined),
      trophies: Math.max(0, Number(row.trophies) || 0),
      online: !!(row.online || (p && Date.now() - p.at < 90_000)),
      inBattle: !!(row.inBattle || p?.inBattle),
      isYou: code === myCode,
    })
  }

  // Local all-time seen registry (this device)
  for (const row of loadSeenLeaderboardPlayers()) {
    const prev = map.get(row.code)
    const p = live[row.code]
    const dir = lookupDirectory(row.code)
    map.set(row.code, {
      code: row.code,
      name: leaderboardDisplayName(
        row.code,
        row.name,
        prev?.name,
        p?.name,
        dir || undefined,
      ),
      trophies: Math.max(prev?.trophies ?? 0, row.trophies),
      online: !!(prev?.online || (p && Date.now() - p.at < 90_000)),
      inBattle: !!(prev?.inBattle || p?.inBattle),
      isYou: row.code === myCode,
    })
  }

  // Friends with known trophies (in case not on server board yet)
  for (const f of loadFriends()) {
    if (!f.playerId) continue
    const code = f.playerId.replace(/\D/g, '').slice(0, 6)
    if (code.length !== 6) continue
    const p = live[code]
    const prev = map.get(code)
    const dir = lookupDirectory(code)
    const trophies = Math.max(
      prev?.trophies ?? 0,
      typeof f.trophies === 'number' ? f.trophies : 0,
      typeof p?.trophies === 'number' ? p.trophies : 0,
    )
    map.set(code, {
      code,
      name: leaderboardDisplayName(code, prev?.name, f.name, p?.name, dir || undefined),
      trophies,
      online: !!(prev?.online || (p && Date.now() - p.at < 90_000)),
      inBattle: !!(prev?.inBattle || p?.inBattle),
      isYou: code === myCode,
    })
  }

  // Live presence fill
  for (const [code, p] of Object.entries(live)) {
    if (!p || code.length !== 6) continue
    const prev = map.get(code)
    const dir = lookupDirectory(code)
    map.set(code, {
      code,
      name: leaderboardDisplayName(code, prev?.name, p.name, dir || undefined),
      trophies:
        typeof p.trophies === 'number'
          ? Math.max(prev?.trophies ?? 0, p.trophies)
          : (prev?.trophies ?? 0),
      online: Date.now() - p.at < 90_000,
      inBattle: !!p.inBattle,
      isYou: code === myCode,
    })
  }

  // Always include you
  if (myCode.length === 6) {
    const prev = map.get(myCode)
    map.set(myCode, {
      code: myCode,
      name: myName || prev?.name || 'You',
      trophies: Math.max(myTrophies, prev?.trophies ?? 0),
      online: true,
      inBattle: prev?.inBattle ?? false,
      isYou: true,
    })
  }

  const seen = loadSeenLeaderboardPlayers()
  const seenMap = new Map(seen.map((r) => [r.code, r]))
  const friendByCode = new Map(
    loadFriends()
      .filter((f) => f.playerId)
      .map((f) => [f.playerId!.replace(/\D/g, '').slice(0, 6), f]),
  )
  for (const [code, row] of map) {
    if (code === myCode) {
      row.avatarId = mine.avatarId
      row.titleId = mine.titleId
      row.frameId = mine.frameId
      continue
    }
    const p = live[code]
    const f = friendByCode.get(code)
    const s = seenMap.get(code)
    const rem = remote.find((r) => r.code === code)
    row.avatarId = p?.avatarId || rem?.avatarId || f?.avatarId || s?.avatarId
    row.titleId = p?.titleId || rem?.titleId || f?.titleId || s?.titleId
    row.frameId = p?.frameId || rem?.frameId || f?.frameId || s?.frameId
  }

  return [...map.values()].sort(
    (a, b) => b.trophies - a.trophies || a.name.localeCompare(b.name),
  )
}

function PlayerProfileModal({
  row,
  rank,
  onClose,
  onAddFriend,
  onBattle,
}: {
  row: BoardRow
  rank: number
  onClose: () => void
  onAddFriend?: () => void
  onBattle?: () => void
}) {
  const alreadyFriend = loadFriends().some(
    (f) => f.playerId?.replace(/\D/g, '').slice(0, 6) === row.code,
  )
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lb-profile-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl p-5"
        style={{
          background: 'linear-gradient(180deg,#3a2418,#1a100c)',
          boxShadow: '0 12px 40px #00000088',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[0.65rem] font-extrabold uppercase tracking-wide text-white/45">
          Rank #{rank}
          {row.isYou ? ' · You' : ''}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <ProfileChip
            avatarId={row.avatarId}
            titleId={row.titleId}
            frameId={row.frameId}
            size="lg"
          />
          <div className="min-w-0">
        <h2
          id="lb-profile-title"
          className="font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]"
        >
          {row.name}
        </h2>
        <NameWithTitle titleId={row.titleId} titleClass="mt-0.5 text-[0.75rem] font-extrabold tracking-wide" />
        <p className="mt-1 text-sm font-extrabold uppercase tracking-wide text-white/55">
          {row.inBattle ? 'In battle' : row.online ? 'Online' : 'Offline'}
        </p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-[#140e0a] px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[0.65rem] font-extrabold uppercase tracking-wide text-white/45">
              Code
            </dt>
            <dd className="font-bold tracking-wider text-white">
              {formatAccountCode(row.code)}
            </dd>
          </div>
          <div className="rounded-lg bg-[#140e0a] px-3 py-2 ring-1 ring-white/10">
            <dt className="text-[0.65rem] font-extrabold uppercase tracking-wide text-white/45">
              Trophies
            </dt>
            <dd className="font-bold text-[#f5d76e]">{row.trophies.toLocaleString()}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-col gap-2">
          {!row.isYou && onBattle ? (
            <button
              type="button"
              disabled={!row.online || row.inBattle}
              onClick={onBattle}
              className="w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
              style={{ background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)' }}
            >
              Invite to battle
            </button>
          ) : null}
          {!row.isYou && onAddFriend && !alreadyFriend ? (
            <button
              type="button"
              onClick={onAddFriend}
              className="w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
            >
              Add friend
            </button>
          ) : null}
          {!row.isYou && alreadyFriend ? (
            <p className="text-center text-xs font-bold text-[#7dff9a]">Already friends</p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#2a1a12] py-2.5 text-xs font-extrabold text-white/80 ring-1 ring-white/15"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProfileScreen({ onOpenSocial, onAddByCode, onRequestBattle }: Props) {
  const [name, setName] = useState(() => loadPlayerName())
  const [avatarId, setAvatarId] = useState(() => loadAvatarId())
  const [cosmetics, setCosmetics] = useState(() => loadCosmetics())
  const [owned, setOwned] = useState(() => loadOwnedEmotes())
  const [active, setActive] = useState(() => loadActiveEmotes())
  const [emoteMsg, setEmoteMsg] = useState<string | null>(null)
  const [remoteBoard, setRemoteBoard] = useState<MpLeaderboardRow[]>([])
  const [selected, setSelected] = useState<BoardRow | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const profile = useMemo(() => loadProfile(), [avatarId, name, remoteBoard])
  const progress = useMemo(() => loadCardProgress(), [])
  const code = useMemo(() => loadAccountCode(), [])
  const myId = useMemo(() => loadPlayerId(), [])
  const level = playerLevelFromXp(profile.xp)
  const unlocked = useMemo(
    () => CHARACTERS.filter((c) => progress.unlocked.includes(c.id)),
    [progress],
  )

  const refreshBoard = useCallback(async () => {
    const myCode = loadPlayerId().replace(/\D/g, '').slice(0, 6)
    const me = loadPlayerName().trim() || 'Player'
    const myTrophies = loadProfile().trophies
    const mine = cosmeticsPayload()
    noteSeenLeaderboardPlayer(myCode, me, myTrophies, mine)

    const live = mpLastPresence()
    const payload: {
      code: string
      name: string
      trophies?: number
      avatarId?: string
      titleId?: string
      frameId?: string
    }[] = [{ code: myCode, name: me, trophies: myTrophies, ...mine }]

    const pushRow = (code: string, name: string | undefined, trophies?: number) => {
      if (code.length !== 6) return
      const dir = lookupDirectory(code)
      const liveName = live[code]?.name
      const best =
        preferRealPlayerName(name, dir || undefined, liveName) || name || dir || liveName || ''
      // Only report a real name — placeholders must not overwrite the server board.
      if (best && !isPlaceholderFriendName(best)) {
        noteSeenLeaderboardPlayer(code, best, trophies)
        payload.push({ code, name: best, trophies })
      } else if (typeof trophies === 'number') {
        payload.push({ code, name: '', trophies })
      }
    }

    for (const f of loadFriends()) {
      if (!f.playerId) continue
      const code = f.playerId.replace(/\D/g, '').slice(0, 6)
      pushRow(code, f.name, f.trophies)
    }
    for (const row of loadSeenLeaderboardPlayers()) {
      pushRow(row.code, row.name, row.trophies)
    }
    for (const [code, p] of Object.entries(live)) {
      if (!p?.name) continue
      pushRow(code, p.name, p.trophies)
    }
    // Dedupe by code (last write wins)
    const uniq = new Map(payload.map((p) => [p.code, p]))
    await mpReportLeaderboard([...uniq.values()])
    let rows = await mpFetchLeaderboard()
    // Try to resolve placeholder rows to real names (online directory / lobby).
    const needNames = rows
      .filter((r) => isPlaceholderFriendName(r.name || ''))
      .slice(0, 12)
    if (needNames.length) {
      const healed: { code: string; name: string; trophies?: number }[] = []
      await Promise.all(
        needNames.map(async (r) => {
          const code = String(r.code || '').replace(/\D/g, '').slice(0, 6)
          if (code.length !== 6) return
          const resolved = await resolvePlayerName(code, 2_500)
          const best = preferRealPlayerName(resolved, lookupDirectory(code) || undefined)
          if (!best) return
          noteSeenLeaderboardPlayer(code, best, r.trophies)
          healed.push({ code, name: best, trophies: r.trophies })
        }),
      )
      if (healed.length) {
        await mpReportLeaderboard(healed)
        rows = await mpFetchLeaderboard()
      }
    }
    setRemoteBoard(rows)
    // Mirror server rows into local all-time cache (noteSeen keeps real names)
    for (const row of rows) {
      const dir = lookupDirectory(row.code)
      const liveName = live[row.code]?.name
      const best = preferRealPlayerName(row.name, dir || undefined, liveName) || row.name
      noteSeenLeaderboardPlayer(row.code, best, row.trophies)
    }
  }, [])

  useEffect(() => {
    void refreshBoard()
    const id = window.setInterval(() => void refreshBoard(), 12_000)
    return () => window.clearInterval(id)
  }, [refreshBoard])

  const board = useMemo(
    () =>
      mergeBoard(
        remoteBoard,
        myId.replace(/\D/g, '').slice(0, 6),
        name.trim() || 'You',
        profile.trophies,
        { avatarId, titleId: cosmetics.titleId, frameId: cosmetics.frameId },
      ),
    [remoteBoard, myId, name, profile.trophies, avatarId, cosmetics.titleId, cosmetics.frameId],
  )

  const myRank = board.findIndex((r) => r.isYou) + 1

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

  async function addSelectedFriend() {
    if (!selected || !onAddByCode) return
    const res = await onAddByCode(selected.code)
    setActionMsg(res.message)
    window.setTimeout(() => setActionMsg(null), 2200)
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
          <ProfileChip
            avatarId={avatarId}
            titleId={cosmetics.titleId}
            frameId={cosmetics.frameId}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => persistName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="w-full rounded-lg bg-[#140e0a] px-2.5 py-1.5 text-base font-extrabold text-white outline-none ring-1 ring-white/15"
            />
            {getTitle(cosmetics.titleId).text ? (
              <p
                className="mt-0.5 text-[0.7rem] font-extrabold tracking-wide"
                style={{ color: titleColor(getTitle(cosmetics.titleId)) }}
              >
                {getTitle(cosmetics.titleId).text}
              </p>
            ) : null}
            <p className="mt-1 text-sm font-bold text-white/80">
              {profile.trophies} trophies · Peak {profile.peakTrophies}
            </p>
            <p className="text-xs font-extrabold text-[#f5d76e]/85">
              Level {level.level} · Friend code {formatAccountCode(code)}
              {myRank > 0 ? ` · Rank #${myRank}` : ''}
            </p>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-[0.7rem] font-extrabold uppercase tracking-wide text-white/75">
                Leaderboard
              </p>
              <p className="text-xs font-semibold text-white/55">
                Everyone who has played · grows as players open Phil Royale
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshBoard()}
              className="rounded-lg bg-[#2a1a12] px-2.5 py-1 text-[0.65rem] font-extrabold text-[#f5d76e] ring-1 ring-white/15"
            >
              Refresh
            </button>
          </div>
          <ul
            className="max-h-[min(28rem,55vh)] overflow-y-auto rounded-xl"
            style={{
              background: 'linear-gradient(180deg,#2a1a12,#140e0a)',
              boxShadow: 'inset 0 0 0 1px #c9a22733',
            }}
          >
            {board.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm font-semibold text-white/50">
                No players yet — keep Phil Royale open to join the board.
              </li>
            ) : (
              board.map((row, i) => {
                const rank = i + 1
                return (
                  <li key={row.code}>
                    <button
                      type="button"
                      onClick={() => setSelected(row)}
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                      style={
                        row.isYou
                          ? {
                              background:
                                'linear-gradient(90deg,#f5d76e33 0%, #f5d76e14 55%, transparent 100%)',
                              boxShadow: 'inset 3px 0 0 #f5d76e',
                            }
                          : undefined
                      }
                    >
                      <span
                        className={`w-7 shrink-0 text-center text-xs font-black ${
                          rank <= 3 ? 'text-[#f5d76e]' : 'text-white/45'
                        }`}
                      >
                        {rank}
                      </span>
                      <ProfileChip
                        avatarId={row.isYou ? avatarId : row.avatarId}
                        frameId={row.isYou ? cosmetics.frameId : row.frameId}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <NameWithTitle
                          name={row.name}
                          titleId={row.isYou ? cosmetics.titleId : row.titleId}
                          you={row.isYou}
                          nameClass="truncate text-sm font-extrabold text-white"
                        />
                      </div>
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          row.online ? 'bg-[#7dff9a]' : 'bg-white/25'
                        }`}
                        title={row.online ? 'Online' : 'Offline'}
                      />
                      <span className="shrink-0 text-sm font-extrabold tabular-nums text-[#f5d76e]">
                        {row.trophies.toLocaleString()}
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {actionMsg ? (
            <p className="mt-1.5 text-xs font-bold text-[#7dff9a]">{actionMsg}</p>
          ) : null}
        </section>

        <section className="mt-4">
          <p className="mb-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-white/75">
            Title
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {TITLE_CATALOG.filter((t) => cosmetics.ownedTitles.includes(t.id)).map((t) => {
              const on = cosmetics.titleId === t.id
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      equipTitle(t.id)
                      setCosmetics(loadCosmetics())
                    }}
                    className="rounded-full px-2.5 py-1 text-[0.65rem] font-extrabold"
                    style={{
                      color: titleColor(t),
                      background: on ? '#2a1a12' : '#140e0a',
                      boxShadow: on ? `inset 0 0 0 2px ${titleColor(t)}` : 'inset 0 0 0 1px #ffffff22',
                    }}
                  >
                    {t.text || 'None'}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mb-2 mt-3 text-[0.7rem] font-extrabold uppercase tracking-wide text-white/75">
            Frame
          </p>
          <ul className="flex flex-wrap gap-2">
            {FRAME_CATALOG.filter((f) => cosmetics.ownedFrames.includes(f.id)).map((f) => {
              const on = cosmetics.frameId === f.id
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => {
                      equipFrame(f.id)
                      setCosmetics(loadCosmetics())
                    }}
                    className="rounded-md p-0.5"
                    style={{ boxShadow: on ? '0 0 0 2px #fff' : 'none' }}
                    aria-label={f.label}
                  >
                    <FramePreview frameId={f.id} className="h-9 w-9" />
                  </button>
                </li>
              )
            })}
          </ul>
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

      {selected ? (
        <PlayerProfileModal
          row={selected}
          rank={Math.max(1, board.findIndex((r) => r.code === selected.code) + 1)}
          onClose={() => setSelected(null)}
          onAddFriend={onAddByCode ? () => void addSelectedFriend() : undefined}
          onBattle={
            onRequestBattle
              ? () => {
                  onRequestBattle(selected.code, selected.name)
                  setSelected(null)
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}
