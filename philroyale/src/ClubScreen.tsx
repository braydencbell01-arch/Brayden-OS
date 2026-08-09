import { useEffect, useMemo, useState } from 'react'
import { getCharacter } from './characters'
import {
  CLUB_BADGES,
  CLUB_CHEST_GOAL,
  roleLabel,
  roleRank,
  type ClubMember,
} from './clubMeta'
import { normalizeClubCode, publishClub } from './clubHub'
import { joinClubVerified } from './clubSync'
import { formatWarRemain, phaseLabel } from './clubWar'
import { PRESENCE_ONLINE_MS, type FriendPresenceInfo } from './socialHub'
import {
  CLUB_SHOP_OFFERS,
  advanceRiverRace,
  beginWarAttack,
  buyClubShopOffer,
  claimClubChest,
  claimWarRewards,
  clubMemberCount,
  contributeWarCollection,
  createRichClub,
  fulfillDonation,
  loadCardProgress,
  loadClubWar,
  loadPlayerId,
  loadPlayerName,
  loadProfile,
  loadRichClub,
  postClubChat,
  pruneFakeClubMembers,
  repairBrokenLocalClub,
  requestClubDonation,
  saveRichClub,
  shareText,
  simWarAttack,
  startClubWar,
  clubInviteUrl,
  upsertFriend,
  type ClubWarState,
  type GameMode,
  type RichClub,
} from './storage'

type Props = {
  onBattleBot: (opponentName?: string) => void
  onRequestBattle?: (
    friendName: string,
    opts?: { mode?: GameMode; playerId?: string },
  ) => Promise<void>
  friendPresence?: Record<string, FriendPresenceInfo>
}

export function ClubScreen({
  onBattleBot,
  onRequestBattle,
  friendPresence = {},
}: Props) {
  const [club, setClub] = useState<RichClub | null>(() => {
    repairBrokenLocalClub()
    pruneFakeClubMembers()
    return loadRichClub()
  })
  const [tab, setTab] = useState<'home' | 'chat' | 'members' | 'donate' | 'war' | 'shop'>(
    'home',
  )
  const [toast, setToast] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [badge, setBadge] = useState(0)
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [donateChar, setDonateChar] = useState('finley')
  const [profile, setProfile] = useState(() => loadProfile())
  const [war, setWar] = useState<ClubWarState>(() => loadClubWar())
  const [memberProfile, setMemberProfile] = useState<ClubMember | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const progress = loadCardProgress()

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (tab !== 'war') return
    const id = window.setInterval(() => {
      setNow(Date.now())
      setWar(loadClubWar())
    }, 15000)
    return () => window.clearInterval(id)
  }, [tab])

  // Refresh UI when App-level club sync updates the roster.
  useEffect(() => {
    const onClub = () => setClub(loadRichClub())
    window.addEventListener('philroyale-club-changed', onClub)
    return () => window.removeEventListener('philroyale-club-changed', onClub)
  }, [])

  const unlockedCards = useMemo(
    () =>
      progress.unlocked
        .map((id) => getCharacter(id))
        .filter(Boolean)
        .sort((a, b) => a!.name.localeCompare(b!.name)),
    [progress.unlocked],
  )

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }

  function refresh() {
    setClub(loadRichClub())
    setProfile(loadProfile())
    setWar(loadClubWar())
  }

  if (!club) {
    return (
      <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
        <header className="shrink-0 px-4 pb-2 pt-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[#f5d76e]">
            Club
          </h1>
          <p className="text-sm font-semibold text-white/70">
            Create or join a club — chat, donate, fill the club chest, fight wars.
          </p>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-4">
          <section
            className="rounded-xl p-3"
            style={{ background: 'linear-gradient(180deg,#2f6fbf,#1d4a86)' }}
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-white/80">
              Create club
            </p>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Club name"
              className="mt-2 w-full rounded-lg bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/20 placeholder:text-white/40"
            />
            <input
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Description (optional)"
              className="mt-2 w-full rounded-lg bg-black/30 px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/20 placeholder:text-white/40"
            />
            <p className="mt-2 text-[0.65rem] font-extrabold uppercase text-white/70">Badge</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CLUB_BADGES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBadge(b.id)}
                  className="h-9 w-9 rounded-lg text-[0.65rem] font-black"
                  style={{
                    background: b.color,
                    color: '#1a1410',
                    outline: badge === b.id ? '2px solid #fff' : 'none',
                  }}
                  title={b.label}
                >
                  {b.label.slice(0, 1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!createName.trim()) {
                  flash('Enter a club name')
                  return
                }
                const c = createRichClub(createName, createDesc, badge)
                setClub(c)
                window.dispatchEvent(new Event('philroyale-club-changed'))
                flash(`${c.name} founded! Share code ${c.code}`)
              }}
              className="mt-3 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Create club
            </button>
          </section>
          <section
            className="rounded-xl p-3"
            style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
          >
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#f5d76e]/85">
              Join with club invite code (6 letters)
            </p>
            <p className="mt-1 text-[0.7rem] font-semibold text-white/50">
              Not a friend code (those are 3 digits under Friends). Brother must keep Phil Royale
              open while you join.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. 4W69RP"
                maxLength={8}
                disabled={joining}
                className="min-w-0 flex-1 rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold uppercase text-white outline-none ring-1 ring-white/15 disabled:opacity-50"
              />
              <button
                type="button"
                disabled={joining}
                onClick={() => {
                  const c = normalizeClubCode(joinCode)
                  if (c.length !== 6) {
                    flash(
                      c.length === 3
                        ? 'That is a friend code — use Friends → Add friend'
                        : 'Club codes are exactly 6 characters',
                    )
                    return
                  }
                  setJoining(true)
                  flash(`Looking up club ${c}…`)
                  void joinClubVerified(c).then((res) => {
                    setJoining(false)
                    setClub(res.club)
                    flash(res.message)
                    if (res.ok) {
                      setJoinCode('')
                      window.dispatchEvent(new Event('philroyale-club-changed'))
                    }
                  })
                }}
                className="rounded-lg px-3 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
              >
                {joining ? '…' : 'Join'}
              </button>
            </div>
          </section>
        </div>
        {toast ? <Toast text={toast} /> : null}
      </div>
    )
  }

  const badgeMeta = CLUB_BADGES[club.badge] ?? CLUB_BADGES[0]!
  const sortedMembers = [...club.members].sort(
    (a, b) => roleRank(b.role) - roleRank(a.role) || b.trophies - a.trophies,
  )

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#140e0a]">
      <header className="shrink-0 px-3 pb-2 pt-1">
        <div className="flex items-start gap-2">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-[#1a1410]"
            style={{ background: badgeMeta.color }}
          >
            {badgeMeta.label.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
              {club.name}
            </h1>
            <p className="text-xs font-bold text-white/70">
              {club.tag} · {clubMemberCount(club)} · {club.trophies} club trophies
            </p>
          </div>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {(
            [
              ['home', 'Home'],
              ['chat', 'Chat'],
              ['members', 'Members'],
              ['donate', 'Donate'],
              ['war', 'War'],
              ['shop', 'Shop'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.65rem] font-extrabold uppercase"
              style={{
                background: tab === id ? 'linear-gradient(180deg,#ffe08a,#c9a227)' : '#2a1a12',
                color: tab === id ? '#1a1410' : '#fff6e8',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {tab === 'home' ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/75">{club.description}</p>
            <div
              className="rounded-xl p-3"
              style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
            >
              <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">Club chest</p>
              <p className="mt-1 text-sm font-bold text-white">
                {club.chestCrowns}/{CLUB_CHEST_GOAL} crowns
                {club.chestClaimed ? ' · claimed' : ''}
              </p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((club.chestCrowns / CLUB_CHEST_GOAL) * 100)}%`,
                    background: 'linear-gradient(90deg,#ffe08a,#c9a227)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const r = claimClubChest()
                  flash(r.message)
                  refresh()
                }}
                disabled={club.chestClaimed || club.chestCrowns < 20}
                className="mt-2 w-full rounded-lg py-2 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Claim club chest
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Stat tile="Weekly donations" value={String(club.weeklyDonations)} />
              <Stat tile="War stars" value={String(club.warStars)} />
              <Stat tile="Your donate left" value={String(profile.donateLeft)} />
              <Stat tile="Access" value={club.access === 'open' ? 'Open' : 'Invite only'} />
            </div>
            <div
              className="rounded-xl p-3"
              style={{ background: 'linear-gradient(180deg,#1a5a6a,#0e3038)' }}
            >
              <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">River Race</p>
              <p className="mt-1 text-sm font-bold text-white">
                Paddle for club chest crowns with your crew.
              </p>
              <button
                type="button"
                onClick={() => {
                  const r = advanceRiverRace()
                  flash(r.message)
                  refresh()
                }}
                className="mt-2 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Race the river
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                void shareText(
                  'Phil Royale club',
                  `Join my Phil Royale club "${club.name}" (${club.tag}):`,
                  clubInviteUrl(club.code),
                )
              }
              className="w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
              style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
            >
              Text invite · code {club.code}
            </button>
            <button
              type="button"
              onClick={() => {
                const cur = loadRichClub()
                if (cur) {
                  void publishClub(cur.code, {
                    type: 'club_leave',
                    code: cur.code,
                    fromPlayerId: loadPlayerId(),
                    fromName: loadPlayerName().trim() || 'Player',
                    at: new Date().toISOString(),
                  })
                }
                saveRichClub(null)
                setClub(null)
                window.dispatchEvent(new Event('philroyale-club-changed'))
                flash('Left club')
              }}
              className="w-full rounded-lg bg-[#2a1a12] py-2 text-xs font-extrabold text-[#ff8a7a]"
            >
              Leave club
            </button>
          </div>
        ) : null}

        {tab === 'chat' ? (
          <div className="flex h-full min-h-[20rem] flex-col">
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {[...club.chat].reverse().map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg px-2.5 py-2"
                  style={{
                    background:
                      m.kind === 'system' || m.kind === 'war'
                        ? '#1a2a18'
                        : m.kind === 'donate'
                          ? '#1a2030'
                          : '#221610',
                  }}
                >
                  <p className="text-[0.65rem] font-extrabold uppercase text-[#f5d76e]/80">
                    {m.from}
                    <span className="ml-2 font-semibold normal-case text-white/40">
                      {new Date(m.at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                  <p className="text-sm font-semibold text-white/90">{m.text}</p>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Club chat…"
                className="min-w-0 flex-1 rounded-lg bg-[#221610] px-3 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    postClubChat(chatInput)
                    setChatInput('')
                    refresh()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  postClubChat(chatInput)
                  setChatInput('')
                  refresh()
                }}
                className="rounded-lg px-3 py-2 text-sm font-extrabold text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Send
              </button>
            </div>
          </div>
        ) : null}

        {tab === 'members' ? (
          <ul className="space-y-1.5">
            {sortedMembers.map((m) => {
              const online =
                m.isYou ||
                (!!m.playerId &&
                  !!friendPresence[m.playerId] &&
                  now - friendPresence[m.playerId]!.at < PRESENCE_ONLINE_MS)
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={!!m.isYou}
                    onClick={() => setMemberProfile(m)}
                    className="flex w-full items-center justify-between rounded-lg bg-[#221610] px-3 py-2 text-left ring-1 ring-white/10 disabled:opacity-90"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {m.isYou ? '★ ' : ''}
                        {m.name}
                        {online ? (
                          <span className="ml-1 text-[0.6rem] font-extrabold text-[#7dff9a]">
                            ONLINE
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[0.65rem] font-semibold text-white/55">
                        {roleLabel(m.role)}
                        {m.playerId ? ` · ${m.playerId.slice(0, 4)}…` : ''}
                        {m.isYou ? '' : ' · Tap profile'}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-[#f5d76e]">{m.trophies}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}

        {tab === 'donate' ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-white/65">
              Donate copies to clubmates · {profile.donateLeft} left today
            </p>
            <div
              className="rounded-xl p-3"
              style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
            >
              <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">
                Request cards
              </p>
              <select
                value={donateChar}
                onChange={(e) => setDonateChar(e.target.value)}
                className="mt-2 w-full rounded-lg bg-[#140e0a] px-2 py-2 text-sm font-semibold text-white outline-none ring-1 ring-white/15"
              >
                {unlockedCards.map((c) => (
                  <option key={c!.id} value={c!.id}>
                    {c!.name} ({progress.copies[c!.id] ?? 0} owned)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const r = requestClubDonation(donateChar)
                  flash(r.message)
                  if (r.club) setClub(r.club)
                }}
                className="mt-2 w-full rounded-lg py-2 text-sm font-extrabold text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Post request
              </button>
            </div>
            <ul className="space-y-2">
              {club.donateRequests.length === 0 ? (
                <p className="rounded-lg bg-[#221610] px-3 py-4 text-center text-sm font-semibold text-white/55">
                  No open donation requests
                </p>
              ) : (
                club.donateRequests.map((r) => {
                  const c = getCharacter(r.charId)
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[#221610] px-3 py-2.5 ring-1 ring-white/10"
                    >
                      <div>
                        <p className="font-bold text-white">
                          {r.from} · {c?.name ?? r.charId}
                        </p>
                        <p className="text-xs font-semibold text-white/55">
                          {r.have}/{r.need} donated
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const res = fulfillDonation(r.id)
                          flash(res.message)
                          if (res.club) setClub(res.club)
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-extrabold text-white"
                        style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
                      >
                        Donate
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        ) : null}

        {tab === 'war' ? (
          <ClubWarPanel
            clubName={club.name}
            war={war}
            now={now}
            flash={flash}
            refresh={refresh}
            onBattleBot={onBattleBot}
          />
        ) : null}

        {tab === 'shop' ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-white/65">
              Spend gold on club-only boosts · you have {profile.gold}g
            </p>
            {CLUB_SHOP_OFFERS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  const r = buyClubShopOffer(o.id)
                  flash(r.message)
                  refresh()
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ring-1 ring-white/10"
                style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
              >
                <span>
                  <span className="block text-sm font-extrabold text-white">{o.label}</span>
                  <span className="text-[0.65rem] font-semibold text-white/55">
                    Club exclusive
                  </span>
                </span>
                <span className="rounded-lg bg-[#f5d76e] px-2 py-1 text-xs font-black text-[#1a1410]">
                  {o.costGold}g
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {memberProfile && !memberProfile.isYou ? (
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
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]">
              {memberProfile.name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/70">
              {roleLabel(memberProfile.role)} · {memberProfile.trophies} trophies
            </p>
            {memberProfile.playerId ? (
              <p className="mt-1 text-xs font-bold tracking-wider text-white/50">
                Code {memberProfile.playerId.slice(0, 4)}-{memberProfile.playerId.slice(4)}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!memberProfile.playerId || !onRequestBattle}
              onClick={() => {
                const m = memberProfile
                if (!m.playerId || !onRequestBattle) return
                upsertFriend({ name: m.name, playerId: m.playerId })
                window.dispatchEvent(new Event('philroyale-friends-changed'))
                setMemberProfile(null)
                void onRequestBattle(m.name, { mode: 'classic', playerId: m.playerId })
                flash(`Invite sent to ${m.name}`)
              }}
              className="mt-4 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
              style={{ background: 'linear-gradient(180deg,#7dff9a,#3ecf6a)' }}
            >
              Invite to battle
            </button>
            <p className="mt-2 text-center text-[0.7rem] font-semibold text-white/45">
              They must be online — Accept / Decline pops up on their screen.
            </p>
            <button
              type="button"
              onClick={() => setMemberProfile(null)}
              className="mt-2 w-full rounded-lg bg-[#2a1a12] py-2.5 text-sm font-extrabold text-white/70 ring-1 ring-white/15"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <Toast text={toast} /> : null}
    </div>
  )
}

function Stat({ tile, value }: { tile: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#221610] px-2 py-2 ring-1 ring-white/10">
      <p className="text-[0.6rem] font-extrabold uppercase text-[#f5d76e]/75">{tile}</p>
      <p className="text-sm font-extrabold text-white">{value}</p>
    </div>
  )
}

function Toast({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
      <p className="rounded-lg bg-black/90 px-3 py-2 text-center text-sm font-bold text-white ring-1 ring-[#f5d76e]/45">
        {text}
      </p>
    </div>
  )
}

function ClubWarPanel({
  clubName,
  war,
  now,
  flash,
  refresh,
  onBattleBot,
}: {
  clubName: string
  war: ClubWarState
  now: number
  flash: (msg: string) => void
  refresh: () => void
  onBattleBot: (opponentName?: string) => void
}) {
  const remain =
    war.phaseEndsAt > now ? formatWarRemain(war.phaseEndsAt - now) : null
  const badge = CLUB_BADGES[war.enemyBadge] ?? CLUB_BADGES[0]!

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-3"
        style={{ background: 'linear-gradient(180deg,#5a2a2a,#2a1010)' }}
      >
        <p className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
          Club Wars
        </p>
        <p className="text-sm font-semibold text-white/85">
          {phaseLabel(war.phase)}
          {remain ? ` · ${remain} left` : ''}
        </p>

        {war.phase === 'idle' ? (
          <>
            <p className="mt-2 text-xs font-semibold text-white/65">
              Match your club against a rival. Collection Day → War Day → stars & loot.
            </p>
            <button
              type="button"
              onClick={() => {
                const r = startClubWar()
                flash(r.message)
                refresh()
              }}
              className="mt-3 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
              style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
            >
              Find war match
            </button>
          </>
        ) : null}

        {war.phase !== 'idle' ? (
          <div className="mt-3 grid grid-cols-3 items-center gap-2 text-center">
            <div>
              <p className="text-[0.6rem] font-extrabold uppercase text-white/55">Us</p>
              <p className="truncate text-xs font-bold text-white">{clubName}</p>
              <p className="font-[family-name:var(--font-display)] text-2xl text-[#f5d76e]">
                {war.ourStars}★
              </p>
            </div>
            <p className="text-lg font-black text-white/40">VS</p>
            <div>
              <p className="text-[0.6rem] font-extrabold uppercase text-white/55">Them</p>
              <p className="truncate text-xs font-bold text-white">{war.enemyName}</p>
              <p className="font-[family-name:var(--font-display)] text-2xl text-[#ff8a7a]">
                {war.theirStars}★
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {war.phase === 'collection' ? (
        <div
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
        >
          <p className="text-xs font-extrabold uppercase text-[#f5d76e]/85">
            Collection Day
          </p>
          <p className="mt-1 text-sm font-bold text-white">
            Train for war medals · {war.collection}/{war.collectionGoal}
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round((war.collection / war.collectionGoal) * 100)}%`,
                background: 'linear-gradient(90deg,#4a9eff,#7dff9a)',
              }}
            />
          </div>
          <p className="mt-1 text-[0.65rem] font-semibold text-white/55">
            Finish collection to start War Day early.
          </p>
          <button
            type="button"
            onClick={() => {
              const r = contributeWarCollection()
              flash(r.message)
              refresh()
            }}
            className="mt-2 w-full rounded-lg py-2.5 text-sm font-extrabold text-[#1a1410]"
            style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
          >
            Train / contribute
          </button>
        </div>
      ) : null}

      {war.phase === 'battle' ? (
        <div className="space-y-2">
          <div
            className="rounded-xl px-3 py-2"
            style={{ background: 'linear-gradient(180deg,#1a3048,#101820)' }}
          >
            <p className="text-xs font-bold text-white/80">
              Attacks left: {war.attacksLeft} · Battles fought: {war.battlesFought}
            </p>
            <p className="text-[0.65rem] font-semibold text-white/55">
              Real battle uses your deck; quick fight sims crowns → stars.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#221610] px-2 py-2 ring-1 ring-white/10">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-[#1a1410]"
              style={{ background: badge.color }}
            >
              {badge.label.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-white">{war.enemyName}</p>
              <p className="text-[0.65rem] font-semibold text-white/55">
                {war.enemyTag} · destroy boats for stars
              </p>
            </div>
          </div>
          <ul className="space-y-1.5">
            {war.boats.map((boat) => {
              const full = boat.stars >= 3
              return (
                <li
                  key={boat.id}
                  className="rounded-lg bg-[#221610] px-3 py-2.5 ring-1 ring-white/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white">{boat.defenderName}</p>
                      <p className="text-[0.65rem] font-semibold text-white/55">
                        {boat.defenderTrophies} trophies ·{' '}
                        {'★'.repeat(boat.stars)}
                        {'☆'.repeat(3 - boat.stars)}
                        {boat.attacks > 0 ? ` · ${boat.attacks} hits` : ''}
                      </p>
                    </div>
                    {!full ? (
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          disabled={war.attacksLeft <= 0}
                          onClick={() => {
                            const r = beginWarAttack(boat.id)
                            flash(r.message)
                            if (r.ok && r.opponent) onBattleBot(r.opponent)
                            else refresh()
                          }}
                          className="rounded-lg px-2.5 py-1.5 text-[0.65rem] font-extrabold text-[#1a1410] disabled:opacity-40"
                          style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
                        >
                          Battle
                        </button>
                        <button
                          type="button"
                          disabled={war.attacksLeft <= 0}
                          onClick={() => {
                            const r = simWarAttack(boat.id)
                            flash(r.message)
                            refresh()
                          }}
                          className="rounded-lg bg-[#2a1a12] px-2.5 py-1.5 text-[0.65rem] font-extrabold text-white/80 disabled:opacity-40"
                        >
                          Quick
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-extrabold text-[#7dff9a]">3★</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {war.phase === 'ended' ? (
        <div
          className="rounded-xl p-3"
          style={{ background: 'linear-gradient(180deg,#3a2418,#1f140e)' }}
        >
          <p className="font-[family-name:var(--font-display)] text-lg text-[#f5d76e]">
            {war.ourStars > war.theirStars
              ? 'Victory!'
              : war.ourStars === war.theirStars
                ? 'Draw'
                : 'Defeat'}
          </p>
          <p className="text-sm font-semibold text-white/80">
            Final {war.ourStars}–{war.theirStars} vs {war.enemyName}
          </p>
          <button
            type="button"
            disabled={war.claimed}
            onClick={() => {
              const r = claimWarRewards()
              flash(r.message)
              refresh()
            }}
            className="mt-2 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410] disabled:opacity-45"
            style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
          >
            {war.claimed ? 'Claimed' : 'Claim war rewards'}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onBattleBot()}
        className="w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
        style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
      >
        Ladder battle (club crowns)
      </button>
      <p className="text-center text-xs font-semibold text-white/50">
        Signed in as {loadPlayerName().trim() || 'You'}
      </p>
    </div>
  )
}
