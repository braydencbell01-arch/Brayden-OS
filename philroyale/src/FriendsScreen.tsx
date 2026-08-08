import { useEffect, useState } from 'react'
import {
  clubInviteUrl,
  friendInviteUrl,
  loadFriends,
  loadMyClub,
  loadPlayerName,
  saveFriends,
  saveMyClub,
  savePlayerName,
  shareText,
  type Club,
  type Friend,
} from './storage'

function makeCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends())
  const [club, setClub] = useState<Club | null>(() => loadMyClub())
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [clubName, setClubName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [section, setSection] = useState<'friends' | 'clubs'>('friends')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const clubCode = params.get('club')
    const friendFrom = params.get('friend')
    if (clubCode) {
      const joined: Club = {
        id: `joined-${clubCode}`,
        name: `Club ${clubCode}`,
        tag: `#${clubCode}`,
        description: 'Joined from a text invite.',
        code: clubCode.toUpperCase(),
      }
      setClub(joined)
      saveMyClub(joined)
      setSection('clubs')
    }
    if (friendFrom) {
      const name = friendFrom.trim()
      if (name) {
        setFriends((prev) => {
          if (prev.some((f) => f.name.toLowerCase() === name.toLowerCase())) return prev
          const next = [
            ...prev,
            { id: `f-${Date.now()}`, name, addedAt: new Date().toISOString() },
          ]
          saveFriends(next)
          return next
        })
        setSection('friends')
      }
    }
    if (clubCode || friendFrom) {
      const url = new URL(window.location.href)
      url.search = ''
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  function persistName(name: string) {
    setPlayerName(name)
    savePlayerName(name)
  }

  async function inviteFriendSms() {
    const me = playerName.trim() || 'me'
    await shareText(
      'Phil Royale',
      `Add me on Phil Royale — open this link to friend ${me} and play:`,
      friendInviteUrl(me),
    )
  }

  async function shareClubSms() {
    if (!club) return
    await shareText(
      'Phil Royale club',
      `Join my Phil Royale club "${club.name}" (${club.tag}). Open the link, then we can battle:`,
      clubInviteUrl(club.code),
    )
  }

  function createClub() {
    const name = clubName.trim()
    if (!name) return
    const code = makeCode()
    const next: Club = {
      id: `c-${Date.now()}`,
      name,
      tag: `#${code}`,
      description: 'Your club — share the link by text so friends can join.',
      code,
    }
    setClub(next)
    saveMyClub(next)
    setClubName('')
  }

  function joinByCode() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) return
    const next: Club = {
      id: `joined-${code}`,
      name: `Club ${code}`,
      tag: `#${code}`,
      description: 'Joined with an invite code from a friend.',
      code,
    }
    setClub(next)
    saveMyClub(next)
    setJoinCode('')
  }

  function leaveClub() {
    setClub(null)
    saveMyClub(null)
  }

  function removeFriend(id: string) {
    const next = friends.filter((f) => f.id !== id)
    setFriends(next)
    saveFriends(next)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Friends
        </h1>
        <p className="text-sm font-semibold text-white/70">
          Invite real friends by text. No fake players.
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
              ['clubs', 'Clubs'],
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
        {section === 'friends' ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void inviteFriendSms()}
              className="w-full rounded-xl py-3 text-sm font-extrabold text-[#1a1410]"
              style={{
                background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
                color: '#fff',
                boxShadow: '0 4px 0 #1d4a86',
              }}
            >
              Text invite to a friend
            </button>
            <p className="text-center text-xs font-semibold text-white/50">
              Opens Messages / share — they tap your link to appear here.
            </p>
            {friends.length === 0 ? (
              <p className="rounded-lg bg-[#221610] px-3 py-4 text-center text-sm font-semibold text-white/55 ring-1 ring-white/10">
                No friends yet. Send a text invite.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {friends.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-[#221610] px-3 py-2.5 ring-1 ring-white/10"
                  >
                    <p className="font-bold text-white">{f.name}</p>
                    <button
                      type="button"
                      onClick={() => removeFriend(f.id)}
                      className="text-xs font-extrabold text-[#ff8a7a]"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {club ? (
              <div
                className="rounded-xl p-3"
                style={{
                  background: 'linear-gradient(180deg,#2f6fbf,#1d4a86)',
                  boxShadow: '0 4px 12px #00000055',
                }}
              >
                <p className="text-xs font-extrabold uppercase tracking-wide text-white/80">
                  Your club
                </p>
                <p className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
                  {club.name}
                </p>
                <p className="text-sm font-semibold text-white/85">
                  {club.tag} · code {club.code}
                </p>
                <p className="mt-1 text-sm text-white/75">{club.description}</p>
                <button
                  type="button"
                  onClick={() => void shareClubSms()}
                  className="mt-2 w-full rounded-lg bg-[#f5d76e] py-2 text-sm font-extrabold text-[#1a1410]"
                >
                  Text club invite
                </button>
                <button
                  type="button"
                  onClick={leaveClub}
                  className="mt-2 rounded-lg bg-black/30 px-3 py-1.5 text-xs font-extrabold text-white"
                >
                  Leave club
                </button>
              </div>
            ) : (
              <>
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
                >
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
                    Create a club
                  </p>
                  <input
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="Club name"
                    className="mb-2 w-full rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
                  />
                  <button
                    type="button"
                    onClick={createClub}
                    className="w-full rounded-lg py-2 text-sm font-extrabold text-[#1a1410]"
                    style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
                  >
                    Create club
                  </button>
                </div>
                <div
                  className="rounded-xl p-3"
                  style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
                >
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
                    Join with code from a text
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      className="min-w-0 flex-1 rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold uppercase text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
                    />
                    <button
                      type="button"
                      onClick={joinByCode}
                      className="rounded-lg px-3 py-2 text-sm font-extrabold text-white"
                      style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
                    >
                      Join
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
