import { useEffect, useState } from 'react'
import { searchTowns, type Place } from './geo'

export function useTownSearch(query: string) {
  const [results, setResults] = useState<Place[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }
    const ac = new AbortController()
    const t = window.setTimeout(() => {
      setLoading(true)
      void searchTowns(query, ac.signal)
        .then((r) => {
          setResults(r)
          setError(null)
        })
        .catch((e: unknown) => {
          if ((e as { name?: string })?.name === 'AbortError') return
          setError('Could not search towns. Check your connection.')
          setResults([])
        })
        .finally(() => setLoading(false))
    }, 350)
    return () => {
      ac.abort()
      window.clearTimeout(t)
    }
  }, [query])

  return { results, loading, error }
}

export function TownPicker({
  label,
  value,
  onPick,
  placeholder = 'Search a town or city…',
}: {
  label: string
  value: Place | null
  onPick: (p: Place | null) => void
  placeholder?: string
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const { results, loading, error } = useTownSearch(open ? q : '')

  return (
    <div className="relative">
      <label className="text-xs font-semibold uppercase tracking-[0.14em] text-fog">{label}</label>
      {value ? (
        <div className="mt-1.5 flex items-start justify-between gap-2 rounded-sm border border-line bg-asphalt-lift px-3 py-2.5">
          <p className="text-sm text-ink">{value.label}</p>
          <button
            type="button"
            className="shrink-0 text-xs text-fog underline-offset-2 hover:text-ink hover:underline"
            onClick={() => {
              onPick(null)
              setQ('')
              setOpen(true)
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="mt-1.5 w-full rounded-sm border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-plate"
            autoComplete="off"
          />
          {open && q.trim().length >= 2 && (
            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-sm border border-line bg-paper shadow-md">
              {loading && <li className="px-3 py-2 text-sm text-fog">Searching…</li>}
              {error && <li className="px-3 py-2 text-sm text-signal">{error}</li>}
              {!loading && !error && results.length === 0 && (
                <li className="px-3 py-2 text-sm text-fog">No matches</li>
              )}
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-asphalt-lift"
                    onClick={() => {
                      onPick(p)
                      setQ('')
                      setOpen(false)
                    }}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
