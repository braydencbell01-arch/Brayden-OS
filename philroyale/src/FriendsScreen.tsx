import { useEffect, useMemo, useState } from 'react'
import { ClubScreen } from './ClubScreen'
import { PRESENCE_ONLINE_MS } from './socialHub'
import {
  formatAccountCode,
  joinRichClubByCode,
  loadAccountCode,
  loadFriendMeta,
  loadFriends,
  loadPlayerId,
  loadPlayerName,
  loadRichClub,
  markFriendBattled,
  normalizeAccountCode,
  saveFriendMeta,
  saveFriends,
  savePlayerName,
  upsertFriend,
  type Friend,
  type FriendMeta,
  type GameMode,
} from './storage'

type Props = {
  onBattle: (opponentName: string, mode?: GameMode) => void
  onRequestBattle: (
    friendName: string,
    opts?: { mode?: GameMode; playerId?: string },
  ) => Promise<void>
  onInviteClub: (friendName: string, playerId?: string) => Promise<void>
  waitingForFriend?: string | null
  /** playerId → last presence timestamp (ms) */
  friendPresence?: Record<string, number>
  onAddByCode?: (code: string) => Promise<{ ok: boolean; message: string }>
}

export function FriendsScreen({
  onBattle: _onBattle,
  onRequestBattle,
  onInviteClub,
  waitingForFriend,
  friendPresence = {},
  onAddByCode,
}: Props) {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends())
  const [meta, setMeta] = useState<FriendMeta>(() => loadFriendMeta())
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [friendCode, setFriendCode] = useState('')
  const [addMsg, setAddMsg] = useState<string | null>(null)
  const [section, setSection] = useState<'friends' | 'clubs'>(() =>
    loadRichClub() ? 'clubs' : 'friends',
  )
  const [pendingBattleFriend, setPendingBattleFriend] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [inviteTarget, setInviteTarget] = useState<Friend | null>(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const myCode = useMemo(() => loadAccountCode(), [])

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const ap = meta.pinned[a.id] ? 1 : 0
      const bp = meta.pinned[b.id] ? 1 : 0
      if (ap !== bp) return bp - ap
      const aOnline = isOnline(a, friendPresence, now) ? 1 : 0
      const bOnline = isOnline(b, friendPresence, now) ? 1 : 0
      if (aOnline !== bOnline) return bOnline - aOnline
      const al = meta.lastBattled[a.id] ?? ''
      const bl = meta.lastBattled[b.id] ?? ''
      if (al !== bl) return bl.localeCompare(al)
      return a.name.localeCompare(b.name)
    })
  }, [friends, meta, friendPresence, now])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clubCode = params.get('club')
    if (clubCode) {
      joinRichClubByCode(clubCode)
      setSection('clubs')
      const url = new URL(window.location.href)
      url.searchParams.delete('club')
      window.history.replaceState({}, '', url.toString())
    }
    setFriends(loadFriends())
    const onFriends = () => setFriends(loadFriends())
    window.addEventListener('philroyale-friends-changed', onFriends)
    const tick = window.setInterval(() => setNow(Date.now()), 5000)
    return () => {
      window.removeEventListener('philroyale-friends-changed', onFriends)
      window.clearInterval(tick)
    }
  }, [])

  function persistName(name: string) {
    setPlayerName(name)
    savePlayerName(name)
  }

  function refreshFriends() {
    setFriends(loadFriends())
  }

  async function copyAccountCode() {
    try {
      await navigator.clipboard.writeText(formatAccountCode(myCode))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setAddMsg(`Your code: ${formatAccountCode(myCode)}`)
    }
  }

  async function sendInvite(friend: Friend, mode: GameMode) {
    if (!friend.playerId) {
      setAddMsg('Add them with their account code before inviting.')
      setInviteTarget(null)
      return
    }
    if (!isOnline(friend, friendPresence, Date.now())) {
      setAddMsg(`${friend.name} is offline. They need Phil Royale open to get invites.`)
      setInviteTarget(null)
      return
    }
    setInviteTarget(null)
    setPendingBattleFriend(friend.name)
    try {
      markFriendBattled(friend.id)
      setMeta(loadFriendMeta())
      await onRequestBattle(friend.name, { mode, playerId: friend.playerId })
    } finally {
      setPendingBattleFriend(null)
    }
  }

  async function addFriendByCode() {
    const code = normalizeAccountCode(friendCode)
    if (!code || code.length < 6) {
      setAddMsg('Enter a valid account code (6–10 characters).')
      return
    }
    if (code === loadPlayerId()) {
      setAddMsg("That's your own code.")
      return
    }
    if (onAddByCode) {
      const res = await onAddByCode(code)
      setAddMsg(res.message)
      if (res.ok) {
        setFriendCode('')
        refreshFriends()
      }
      return
    }
    upsertFriend({ name: `Player ${code.slice(0, 4)}`, playerId: code })
    refreshFriends()
    setFriendCode('')
    setAddMsg('Friend added — waiting for them to come online.')
  }

  function togglePin(id: string) {
    setMeta((prev) => {
      const next = {
        ...prev,
        pinned: { ...prev.pinned, [id]: !prev.pinned[id] },
      }
      saveFriendMeta(next)
      return next
    })
  }

  function setNote(id: string, note: string) {
    setMeta((prev) => {
      const next = {
        ...prev,
        notes: { ...prev.notes, [id]: note },
      }
      saveFriendMeta(next)
      return next
    })
  }

  function removeFriend(id: string) {
    const next = friends.filter((f) => f.id !== id)
    setFriends(next)
    saveFriends(next)
  }

  const waitingName = waitingForFriend?.toLowerCase() ?? null

  if (section === 'clubs') {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
        <div className="shrink-0 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="flex gap-2">
            {(
              [
                ['friends', 'Friends'],
                ['clubs', 'Club'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className="flex-1 rounded-lg py-2 text-sm font-extrabold"
                style={{
                  background:
                    section === id ? 'linear-gradient(180deg,#ffe08a,#c9a227)' : '#2a1a12',
                  color: section === id ? '#1a1410' : '#fff6e8',
                  boxShadow: section === id ? '0 3px 0 #8a6a12' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <ClubScreen onBattleBot={(name) => _onBattle(name ?? 'Club Bot')} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Friends
        </h1>
        <p className="text-sm font-semibold text-white/70">
          Share your account code. Add friends by theirs — then Invite when they&apos;re online.
        </p>
        <label className="mt-2 block text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
          Your name
          <input
            value={playerName}
            onChange={(e) => persistName(e.target.value)}
            placeholder="Name friends will see"
            className="mt-1 w-full rounded-lg bg-[#221610] px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
          />
        </label>
        <div className="mt-2 flex gap-2">
          {(
            [
              ['friends', 'Friends'],
              ['clubs', 'Club'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className="flex-1 rounded-lg py-2 text-sm font-extrabold"
              style={{
                background:
                  section === id ? 'linear-gradient(180deg,#ffe08a,#c9a227)' : '#2a1a12',
                color: section === id ? '#1a1410' : '#fff6e8',
                boxShadow: section === id ? '0 3px 0 #8a6a12' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <div className="flex flex-col gap-3">
          <div
            className="rounded-xl p-3"
            style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
              Your account code
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-[0.12em] text-white">
              {formatAccountCode(myCode)}
            </p>
            <button
              type="button"
              onClick={() => void copyAccountCode()}
              className="mt-2 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#7dff9a] ring-1 ring-white/15"
            >
              {copied ? 'Copied!' : 'Copy account code'}
            </button>
          </div>

          <div
            className="rounded-xl p-3"
            style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
          >
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
              Add friend by account code
            </p>
            <div className="flex gap-2">
              <input
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD-EFGH"
                maxLength={12}
                className="min-w-0 flex-1 rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold tracking-wider text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
              />
              <button
                type="button"
                onClick={() => void addFriendByCode()}
                className="rounded-lg px-3 py-2 text-sm font-extrabold text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Add
              </button>
            </div>
            {addMsg ? (
              <p className="mt-2 text-xs font-semibold text-[#7dff9a]">{addMsg}</p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-white/45">
                They must have Phil Royale open to accept invites to battle.
              </p>
            )}
          </div>

          {sortedFriends.length === 0 ? (
            <p className="rounded-lg bg-[#221610] px-3 py-4 text-center text-sm font-semibold text-white/55 ring-1 ring-white/10">
              No friends yet. Copy your code and have a friend enter it under Add friend.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sortedFriends.map((f) => {
                const online = isOnline(f, friendPresence, now)
                const isWaiting =
                  waitingName === f.name.toLowerCase() ||
                  pendingBattleFriend?.toLowerCase() === f.name.toLowerCase()
                const last = meta.lastBattled[f.id]
                const pinned = !!meta.pinned[f.id]
                const note = meta.notes[f.id] ?? ''
                const canInvite = Boolean(f.playerId) && online && !isWaiting
                return (
                  <li
                    key={f.id}
                    className="rounded-lg bg-[#221610] px-3 py-2.5 ring-1 ring-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-white">
                          {pinned ? '★ ' : ''}
                          {f.name}
                          <span
                            className="ml-2 inline-block h-2 w-2 rounded-full"
                            style={{
                              background: online ? '#3ecf6a' : '#6a5a50',
                              boxShadow: online ? '0 0 6px #3ecf6a' : 'none',
                            }}
                            title={online ? 'Online' : 'Offline'}
                          />
                        </p>
                        <p className="text-[0.65rem] font-semibold text-white/50">
                          {f.playerId
                            ? online
                              ? 'Online — ready for invites'
                              : 'Offline — open Phil Royale to play'
                            : 'Missing account code'}
                          {f.playerId ? ` · ${formatAccountCode(f.playerId)}` : ''}
                          {last ? ` · Last play ${new Date(last).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!canInvite}
                        onClick={() => setInviteTarget(f)}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold text-[#1a1410] disabled:opacity-45"
                        style={{
                          background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)',
                          boxShadow: '0 2px 0 #1a7a3a',
                        }}
                      >
                        {isWaiting ? 'Waiting…' : 'Invite'}
                      </button>
                    </div>
                    {editingNoteId === f.id ? (
                      <input
                        autoFocus
                        value={note}
                        onChange={(e) => setNote(f.id, e.target.value)}
                        onBlur={() => setEditingNoteId(null)}
                        placeholder="Note (clan, timezone…)"
                        className="mt-2 w-full rounded bg-[#140e0a] px-2 py-1.5 text-xs font-semibold text-white outline-none ring-1 ring-white/15"
                      />
                    ) : note ? (
                      <p className="mt-1 text-xs font-semibold text-white/55">{note}</p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => togglePin(f.id)}
                        className="text-[10px] font-extrabold uppercase tracking-wide text-[#f5d76e]"
                      >
                        {pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(f.id)}
                        className="text-[10px] font-extrabold uppercase tracking-wide text-white/55"
                      >
                        Note
                      </button>
                      <button
                        type="button"
                        onClick={() => void onInviteClub(f.name, f.playerId)}
                        className="text-[10px] font-extrabold uppercase tracking-wide text-[#7ec8ff]"
                      >
                        Club
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFriend(f.id)}
                        className="text-[10px] font-extrabold uppercase tracking-wide text-[#ff8a7a]"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {inviteTarget ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088',
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Invite {inviteTarget.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/80">
              They&apos;ll get an Accept / Decline popup instantly (no link).
            </p>
            <button
              type="button"
              onClick={() => void sendInvite(inviteTarget, 'classic')}
              className="mt-3 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Classic battle
            </button>
            <button
              type="button"
              onClick={() => void sendInvite(inviteTarget, 'touchdown')}
              className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
            >
              Touchdown
            </button>
            <button
              type="button"
              onClick={() => setInviteTarget(null)}
              className="mt-2 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-white/70 ring-1 ring-white/15"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function isOnline(
  friend: Friend,
  presence: Record<string, number>,
  now: number,
): boolean {
  const id = friend.playerId
  if (!id) return false
  const at = presence[id]
  if (!at) return false
  return now - at < PRESENCE_ONLINE_MS
}
