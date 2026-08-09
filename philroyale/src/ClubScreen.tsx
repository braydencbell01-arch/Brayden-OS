import { useMemo, useState } from 'react'
import { getCharacter } from './characters'
import {
  CLUB_BADGES,
  CLUB_CHEST_GOAL,
  roleLabel,
  roleRank,
} from './clubMeta'
import {
  CLUB_SHOP_OFFERS,
  advanceRiverRace,
  buyClubShopOffer,
  claimClubChest,
  clubMemberCount,
  createRichClub,
  fulfillDonation,
  joinRichClubByCode,
  loadCardProgress,
  loadPlayerName,
  loadProfile,
  loadRichClub,
  playClubWarBattle,
  postClubChat,
  requestClubDonation,
  saveRichClub,
  shareText,
  clubInviteUrl,
  type RichClub,
} from './storage'

type Props = {
  onBattleBot: () => void
}

export function ClubScreen({ onBattleBot }: Props) {
  const [club, setClub] = useState<RichClub | null>(() => loadRichClub())
  const [tab, setTab] = useState<'home' | 'chat' | 'members' | 'donate' | 'war' | 'shop'>(
    'home',
  )
  const [toast, setToast] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [badge, setBadge] = useState(0)
  const [joinCode, setJoinCode] = useState('')
  const [donateChar, setDonateChar] = useState('finley')
  const [profile, setProfile] = useState(() => loadProfile())
  const progress = loadCardProgress()

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
                flash(`${c.name} founded!`)
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
              Join with invite code
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                className="min-w-0 flex-1 rounded-lg bg-[#140e0a] px-3 py-2 text-sm font-semibold uppercase text-white outline-none ring-1 ring-white/15"
              />
              <button
                type="button"
                onClick={() => {
                  if (joinCode.trim().length < 4) {
                    flash('Enter a valid code')
                    return
                  }
                  const c = joinRichClubByCode(joinCode)
                  setClub(c)
                  flash(`Joined ${c.name}`)
                }}
                className="rounded-lg px-3 py-2 text-sm font-extrabold text-white"
                style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
              >
                Join
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
                saveRichClub(null)
                setClub(null)
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
            {sortedMembers.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-[#221610] px-3 py-2 ring-1 ring-white/10"
              >
                <div>
                  <p className="font-bold text-white">
                    {m.isYou ? '★ ' : ''}
                    {m.name}
                    {m.online ? (
                      <span className="ml-1 text-[0.6rem] font-extrabold text-[#7dff9a]">
                        ONLINE
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[0.65rem] font-semibold text-white/55">
                    {roleLabel(m.role)} · {m.donations} donations
                  </p>
                </div>
                <p className="text-sm font-extrabold text-[#f5d76e]">{m.trophies}</p>
              </li>
            ))}
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
          <div className="space-y-3">
            <div
              className="rounded-xl p-3"
              style={{ background: 'linear-gradient(180deg,#5a2a2a,#2a1010)' }}
            >
              <p className="font-[family-name:var(--font-display)] text-xl text-[#f5d76e]">
                Club War
              </p>
              <p className="text-sm font-semibold text-white/80">
                Day {club.warDay}/7 · {club.warStars} stars for {club.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-white/60">
                Fight training battles for war stars (local sim). Wins also fill the club chest.
              </p>
              <button
                type="button"
                onClick={() => {
                  const r = playClubWarBattle()
                  flash(r.message)
                  if (r.club) setClub(r.club)
                }}
                className="mt-3 w-full rounded-lg py-3 text-sm font-extrabold text-[#1a1410]"
                style={{ background: 'linear-gradient(180deg,#ffe08a,#c9a227)' }}
              >
                Fight war battle
              </button>
              <button
                type="button"
                onClick={onBattleBot}
                className="mt-2 w-full rounded-lg py-2.5 text-sm font-extrabold text-white"
                style={{ background: 'linear-gradient(180deg,#4a9eff,#2f6fbf)' }}
              >
                Ladder battle (earns club crowns)
              </button>
            </div>
            <p className="text-center text-xs font-semibold text-white/50">
              Signed in as {loadPlayerName().trim() || 'You'}
            </p>
          </div>
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
