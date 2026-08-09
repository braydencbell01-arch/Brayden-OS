import { useEffect, useMemo, useState } from 'react'
import { ClubScreen } from './ClubScreen'
import {
  friendInviteUrl,
  joinRichClubByCode,
  loadFriendMeta,
  loadFriends,
  loadPlayerId,
  loadPlayerName,
  loadRichClub,
  markFriendBattled,
  saveFriendMeta,
  saveFriends,
  savePlayerName,
  shareText,
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
}

export function FriendsScreen({
  onBattle,
  onRequestBattle,
  onInviteClub,
  waitingForFriend,
}: Props) {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends())
  const [meta, setMeta] = useState<FriendMeta>(() => loadFriendMeta())
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [manualName, setManualName] = useState('')
  const [section, setSection] = useState<'friends' | 'clubs'>(() =>
    loadRichClub() ? 'clubs' : 'friends',
  )
  const [pendingBattleFriend, setPendingBattleFriend] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [inviteTarget, setInviteTarget] = useState<Friend | null>(null)
  const [copied, setCopied] = useState(false)

  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const ap = meta.pinned[a.id] ? 1 : 0
      const bp = meta.pinned[b.id] ? 1 : 0
      if (ap !== bp) return bp - ap
      const al = meta.lastBattled[a.id] ?? ''
      const bl = meta.lastBattled[b.id] ?? ''
      if (al !== bl) return bl.localeCompare(al)
      return a.name.localeCompare(b.name)
    })
  }, [friends, meta])

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
    return () => window.removeEventListener('philroyale-friends-changed', onFriends)
  }, [])

  function persistName(name: string) {
    setPlayerName(name)
    savePlayerName(name)
  }

  function refreshFriends() {
    setFriends(loadFriends())
  }

  async function inviteFriendSms() {
    const me = playerName.trim() || 'me'
    const url = friendInviteUrl(me, loadPlayerId())
    await shareText(
      'Phil Royale',
      `Add me on Phil Royale — open this link and we become friends automatically:`,
      url,
    )
  }

  async function copyFriendLink() {
    const me = playerName.trim() || 'me'
    const url = friendInviteUrl(me, loadPlayerId())
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      await shareText('Phil Royale friend link', 'Add me on Phil Royale:', url)
    }
  }

  async function sendInvite(friend: Friend, mode: GameMode) {
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

  function addFriendManual() {
    const name = manualName.trim()
    if (!name) return
    upsertFriend({ name })
    refreshFriends()
    setManualName('')
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
          <ClubScreen onBattleBot={(name) => onBattle(name ?? 'Club Bot')} />
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
          Share your link — they tap it, you&apos;re both friends. Then Invite to pick a mode.
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
          <button
            type="button"
            onClick={() => void inviteFriendSms()}
            className="w-full rounded-xl py-3 text-sm font-extrabold text-white"
            style={{
              background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
              boxShadow: '0 4px 0 #1d4a86',
            }}
          >
            Share friend link
          </button>
          <button
            type="button"
            onClick={() => void copyFriendLink()}
            className="w-full rounded-xl bg-[#2a1a12] py-2.5 text-sm font-extrabold text-[#7dff9a] ring-1 ring-white/15"
          >
            {copied ? 'Copied!' : 'Copy friend link'}
          </button>
          <p className="text-center text-xs font-semibold text-white/50">
            When they open your link (after entering their name), you both become friends.
          </p>
          <div
            className="rounded-xl p-3"
            style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
          >
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
              Add by name
            </p>
            <div className="flex gap-2">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Friend's name"
                className="min-w-0 flex-1 rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
              />
              <button
                type="button"
                onClick={addFriendManual}
                className="rounded-lg px-3 py-2 text-sm font-extrabold text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Add
              </button>
            </div>
          </div>
          {sortedFriends.length === 0 ? (
            <p className="rounded-lg bg-[#221610] px-3 py-4 text-center text-sm font-semibold text-white/55 ring-1 ring-white/10">
              No friends yet. Share your friend link — it&apos;s the easy way.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sortedFriends.map((f) => {
                const isWaiting =
                  waitingName === f.name.toLowerCase() ||
                  pendingBattleFriend?.toLowerCase() === f.name.toLowerCase()
                const last = meta.lastBattled[f.id]
                const pinned = !!meta.pinned[f.id]
                const note = meta.notes[f.id] ?? ''
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
                        </p>
                        <p className="text-[0.65rem] font-semibold text-white/50">
                          {f.playerId ? 'Online invites ready' : 'Name-only (send them your link)'}
                          {last ? ` · Last play ${new Date(last).toLocaleDateString()}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isWaiting}
                        onClick={() => setInviteTarget(f)}
                        className="shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold text-[#1a1410] disabled:opacity-60"
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
                        className="text-[10px] font-extrabold uppercase tracking-wide text-[#4a9eff]"
                      >
                        Club invite
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          markFriendBattled(f.id)
                          setMeta(loadFriendMeta())
                          onBattle(f.name, 'classic')
                        }}
                        className="text-[10px] font-extrabold uppercase tracking-wide text-white/45"
                      >
                        Practice
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-xl p-5"
            style={{
              background: 'linear-gradient(180deg,#3a2418,#1a100c)',
              boxShadow: '0 12px 40px #00000088, inset 0 1px 0 #c9a22744',
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              Invite {inviteTarget.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-white/80">
              Choose a game mode. They&apos;ll get Accept / Decline on their screen.
            </p>
            <button
              type="button"
              onClick={() => void sendInvite(inviteTarget, 'classic')}
              className="mt-4 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#ffe08a,#c9a227)',
                boxShadow: '0 3px 0 #8a6a12',
              }}
            >
              Classic battle
            </button>
            <button
              type="button"
              onClick={() => void sendInvite(inviteTarget, 'touchdown')}
              className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-white"
              style={{
                background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
                boxShadow: '0 3px 0 #1d4a86',
              }}
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
