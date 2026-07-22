import type { FantasyLeague } from './types'

const JSONBLOB_BASE = 'https://jsonblob.com/api/jsonBlob'

export async function createSyncBlob(league: FantasyLeague): Promise<string> {
  const res = await fetch(JSONBLOB_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(league),
  })
  if (!res.ok) throw new Error('Could not create cloud league sync')
  const location = res.headers.get('Location') || res.headers.get('location')
  const id =
    location?.split('/').filter(Boolean).pop() ||
    res.headers.get('X-jsonblob-id') ||
    res.headers.get('x-jsonblob-id')
  if (!id) throw new Error('Cloud sync did not return an id')
  return id
}

export async function pushLeague(blobId: string, league: FantasyLeague): Promise<void> {
  const res = await fetch(`${JSONBLOB_BASE}/${blobId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(league),
  })
  if (!res.ok) throw new Error('Could not sync league to cloud')
}

export async function pullLeague(blobId: string): Promise<FantasyLeague> {
  const res = await fetch(`${JSONBLOB_BASE}/${blobId}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('Could not load league from invite')
  return (await res.json()) as FantasyLeague
}

/** Invite codes are the cloud blob id (or local id when offline-only). */
export function looksLikeBlobId(code: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    code.trim(),
  )
}
