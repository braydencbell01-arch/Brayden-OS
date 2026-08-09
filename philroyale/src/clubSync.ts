/**
 * Always-on club roster sync + verified join (waits for a real club_state).
 */

import {
  CLUB_HEARTBEAT_MS,
  normalizeClubCode,
  publishClub,
  subscribeClub,
  type ClubMessage,
} from './clubHub'
import {
  applyRemoteClubState,
  clubMembersForSync,
  joinRichClubByCode,
  loadPlayerId,
  loadPlayerName,
  loadProfile,
  loadRichClub,
  pruneFakeClubMembers,
  removeClubMember,
  repairBrokenLocalClub,
  saveRichClub,
  upsertClubMember,
  upsertFriend,
  type RichClub,
} from './storage'

const JOIN_WAIT_MS = 18_000

function publishMyClubPresence(code: string): void {
  const me = loadPlayerName().trim() || 'You'
  const myId = loadPlayerId()
  const cur = loadRichClub()
  if (!cur || cur.code !== code) return
  upsertClubMember({
    playerId: myId,
    name: me,
    trophies: loadProfile().trophies,
    online: true,
    role: cur.members.find((m) => m.isYou || m.playerId === myId)?.role,
  })
  const latest = loadRichClub()
  if (!latest) return
  void publishClub(code, {
    type: 'club_join',
    code,
    fromPlayerId: myId,
    fromName: me,
    trophies: loadProfile().trophies,
    at: new Date().toISOString(),
  })
  // Never advertise a placeholder name as the real club.
  if (!isPlaceholderClubName(latest.name)) {
    void publishClub(code, {
      type: 'club_state',
      code,
      name: latest.name,
      description: latest.description,
      badge: latest.badge,
      members: clubMembersForSync(),
      fromPlayerId: myId,
      at: new Date().toISOString(),
    })
  }
}

export function isPlaceholderClubName(name: string): boolean {
  const n = name.trim()
  if (!n || n.startsWith('Joining')) return true
  if (/^Club [A-Z0-9]{4,8}$/i.test(n)) return true
  return false
}

function handleClubMessage(msg: ClubMessage, code: string, onChange?: () => void): void {
  const myId = loadPlayerId()
  if (msg.type === 'club_join') {
    if (msg.fromPlayerId === myId) return
    upsertClubMember({
      playerId: msg.fromPlayerId,
      name: msg.fromName,
      trophies: msg.trophies,
      online: true,
      role: 'member',
    })
    upsertFriend({ name: msg.fromName, playerId: msg.fromPlayerId })
    window.dispatchEvent(new Event('philroyale-friends-changed'))
    const cur = loadRichClub()
    if (cur && !isPlaceholderClubName(cur.name)) {
      void publishClub(code, {
        type: 'club_state',
        code,
        name: cur.name,
        description: cur.description,
        badge: cur.badge,
        members: clubMembersForSync(),
        fromPlayerId: myId,
        at: new Date().toISOString(),
      })
    }
    onChange?.()
    return
  }
  if (msg.type === 'club_state') {
    if (msg.fromPlayerId === myId) return
    if (!msg.name || isPlaceholderClubName(msg.name)) return
    applyRemoteClubState({
      code: msg.code,
      name: msg.name,
      description: msg.description,
      badge: msg.badge,
      members: msg.members,
    })
    for (const m of msg.members) {
      if (m.playerId !== myId) {
        upsertFriend({ name: m.name, playerId: m.playerId })
      }
    }
    window.dispatchEvent(new Event('philroyale-friends-changed'))
    onChange?.()
    return
  }
  if (msg.type === 'club_leave') {
    if (msg.fromPlayerId === myId) return
    removeClubMember(msg.fromPlayerId)
    onChange?.()
  }
}

/** Keep club roster alive on every screen (not only Social → Club). */
export function startClubSync(onChange?: () => void): () => void {
  repairBrokenLocalClub()
  pruneFakeClubMembers()
  const club = loadRichClub()
  if (!club?.code) return () => {}

  const code = club.code
  const unsub = subscribeClub(code, (msg) => handleClubMessage(msg, code, onChange))
  publishMyClubPresence(code)
  const beat = window.setInterval(() => publishMyClubPresence(code), CLUB_HEARTBEAT_MS)

  return () => {
    unsub()
    window.clearInterval(beat)
  }
}

/**
 * Join only after someone on that code shares a real club_state.
 * Prevents “Club XXXXXX” empty/fake clubs when the code is wrong or leader is offline.
 */
export async function joinClubVerified(
  rawCode: string,
): Promise<{ ok: boolean; message: string; club: RichClub | null }> {
  const code = normalizeClubCode(rawCode)
  if (code.length !== 6) {
    return {
      ok: false,
      message:
        code.length === 8
          ? 'That is an account code — use Friends → Add friend (8 characters).'
          : 'Club invite codes are exactly 6 characters.',
      club: null,
    }
  }

  const existing = loadRichClub()
  if (existing && existing.code === code && !isPlaceholderClubName(existing.name)) {
    const others = existing.members.filter((m) => !m.isYou)
    if (others.length > 0) {
      return { ok: true, message: `Already in ${existing.name}.`, club: existing }
    }
  }

  // Drop any prior fake/solo join for this or other codes before verifying.
  if (existing && (isPlaceholderClubName(existing.name) || existing.code !== code)) {
    const others = existing.members.filter((m) => !m.isYou && m.playerId)
    if (others.length === 0 || isPlaceholderClubName(existing.name)) {
      saveRichClub(null)
    }
  }

  // Local stub so we appear on the channel; name stays Joining… until club_state.
  joinRichClubByCode(code)

  return await new Promise((resolve) => {
    let settled = false
    const finish = (result: { ok: boolean; message: string; club: RichClub | null }) => {
      if (settled) return
      settled = true
      unsub()
      window.clearTimeout(timer)
      resolve(result)
    }

    const unsub = subscribeClub(code, (msg) => {
      handleClubMessage(msg, code)
      if (msg.type === 'club_state' && !isPlaceholderClubName(msg.name)) {
        const club = loadRichClub()
        finish({
          ok: true,
          message: `Joined ${msg.name}!`,
          club,
        })
      }
      // If someone else is already in this code’s channel, their join reply may
      // only send state after our join — also accept a peer join + follow-up state.
      if (msg.type === 'club_join' && msg.fromPlayerId !== loadPlayerId()) {
        // Ask again; peer’s handler should reply with club_state.
        publishMyClubPresence(code)
      }
    })

    publishMyClubPresence(code)

    const timer = window.setTimeout(() => {
      // Timed out — do not leave user stuck in a fake club.
      saveRichClub(null)
      finish({
        ok: false,
        message:
          'No live club found for that code. Your brother must have Phil Royale open (any screen) in his club, then try again.',
        club: null,
      })
    }, JOIN_WAIT_MS)
  })
}
