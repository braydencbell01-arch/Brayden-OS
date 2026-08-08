import { useMemo, useState } from 'react'
import {
  loadClubs,
  loadFriends,
  loadMyClubId,
  saveClubs,
  saveFriends,
  saveMyClubId,
  type Club,
  type Friend,
} from './storage'

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>(() => loadFriends())
  const [clubs, setClubs] = useState<Club[]>(() => loadClubs())
  const [myClubId, setMyClubId] = useState<string | null>(() => loadMyClubId())
  const [friendName, setFriendName] = useState('')
  const [clubName, setClubName] = useState('')
  const [clubDesc, setClubDesc] = useState('')
  const [section, setSection] = useState<'friends' | 'clubs'>('friends')

  const myClub = useMemo(
    () => clubs.find((c) => c.id === myClubId) ?? null,
    [clubs, myClubId],
  )

  function addFriend() {
    const name = friendName.trim()
    if (!name) return
    if (friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setFriendName('')
      return
    }
    const next: Friend[] = [
      ...friends,
      { id: `f-${Date.now()}`, name, online: Math.random() > 0.4 },
    ]
    setFriends(next)
    saveFriends(next)
    setFriendName('')
  }

  function removeFriend(id: string) {
    const next = friends.filter((f) => f.id !== id)
    setFriends(next)
    saveFriends(next)
  }

  function createClub() {
    const name = clubName.trim()
    if (!name) return
    const tag = `#${name.replace(/\s+/g, '').slice(0, 6).toUpperCase()}`
    const club: Club = {
      id: `c-${Date.now()}`,
      name,
      tag,
      members: 1,
      description: clubDesc.trim() || 'A new Phil Royale club.',
    }
    const next = [club, ...clubs]
    setClubs(next)
    saveClubs(next)
    setMyClubId(club.id)
    saveMyClubId(club.id)
    setClubName('')
    setClubDesc('')
    setSection('clubs')
  }

  function joinClub(id: string) {
    setMyClubId(id)
    saveMyClubId(id)
    setClubs((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, members: c.members + (myClubId === id ? 0 : 1) } : c,
      )
      saveClubs(next)
      return next
    })
  }

  function leaveClub() {
    if (!myClubId) return
    setClubs((prev) => {
      const next = prev.map((c) =>
        c.id === myClubId ? { ...c, members: Math.max(1, c.members - 1) } : c,
      )
      saveClubs(next)
      return next
    })
    setMyClubId(null)
    saveMyClubId(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
          Friends
        </h1>
        <p className="text-sm font-semibold text-white/70">
          Add friends and join or create clubs.
        </p>
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
                  section === id
                    ? 'linear-gradient(180deg,#ffe08a,#c9a227)'
                    : '#2a1a12',
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
            <div
              className="rounded-xl p-3"
              style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
            >
              <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
                Add friend
              </p>
              <div className="flex gap-2">
                <input
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="Friend name"
                  className="min-w-0 flex-1 rounded-lg border-0 bg-[#140e0a] px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15 placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={addFriend}
                  className="rounded-lg px-3 py-2 text-sm font-extrabold text-[#1a1410]"
                  style={{ background: 'linear-gradient(180deg,#7dff9a,#2f9f55)' }}
                >
                  Add
                </button>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg bg-[#221610] px-3 py-2.5 ring-1 ring-white/10"
                >
                  <div>
                    <p className="font-bold text-white">{f.name}</p>
                    <p
                      className={`text-xs font-extrabold ${f.online ? 'text-[#7dff9a]' : 'text-white/40'}`}
                    >
                      {f.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
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
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myClub ? (
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
                  {myClub.name}
                </p>
                <p className="text-sm font-semibold text-white/85">
                  {myClub.tag} · {myClub.members} members
                </p>
                <p className="mt-1 text-sm text-white/75">{myClub.description}</p>
                <button
                  type="button"
                  onClick={leaveClub}
                  className="mt-2 rounded-lg bg-black/30 px-3 py-1.5 text-xs font-extrabold text-white"
                >
                  Leave club
                </button>
              </div>
            ) : null}

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
              <input
                value={clubDesc}
                onChange={(e) => setClubDesc(e.target.value)}
                placeholder="Short description"
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

            <p className="text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
              Join a club
            </p>
            <ul className="flex flex-col gap-1.5">
              {clubs.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg bg-[#221610] px-3 py-2.5 ring-1 ring-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{c.name}</p>
                      <p className="text-xs font-semibold text-white/55">
                        {c.tag} · {c.members} members
                      </p>
                      <p className="mt-0.5 text-sm text-white/70">{c.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={myClubId === c.id}
                      onClick={() => joinClub(c.id)}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-extrabold disabled:opacity-40"
                      style={{
                        background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)',
                        color: '#fff',
                      }}
                    >
                      {myClubId === c.id ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
