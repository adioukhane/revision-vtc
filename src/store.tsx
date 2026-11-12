import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, Store } from './types'

const CLE = 'revision-vtc:v1'

const vide = (): Store => ({ version: 1, sessions: [], prefs: {} })

export function charger(): Store {
  try {
    const raw = localStorage.getItem(CLE)
    if (!raw) return vide()
    const s = JSON.parse(raw) as Store
    if (s.version !== 1 || !Array.isArray(s.sessions)) return vide()
    return { ...vide(), ...s }
  } catch {
    return vide()
  }
}

interface Ctx {
  store: Store
  setStore: (f: (s: Store) => Store) => void
  majSession: (id: string, f: (s: Session) => Session) => void
  reinitialiser: () => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setState] = useState<Store>(charger)

  useEffect(() => {
    localStorage.setItem(CLE, JSON.stringify(store))
  }, [store])

  const setStore = useCallback((f: (s: Store) => Store) => setState((s) => f(s)), [])
  const majSession = useCallback(
    (id: string, f: (s: Session) => Session) =>
      setState((st) => ({ ...st, sessions: st.sessions.map((s) => (s.id === id ? f(s) : s)) })),
    [],
  )
  const reinitialiser = useCallback(() => setState(vide()), [])

  return <StoreCtx.Provider value={{ store, setStore, majSession, reinitialiser }}>{children}</StoreCtx.Provider>
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('StoreProvider manquant')
  return c
}

/* ---------- routage par hash (compatible GitHub Pages) ---------- */

export function useRoute(): string[] {
  const lire = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const [r, setR] = useState(lire)
  useEffect(() => {
    const on = () => {
      setR(lire())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export const aller = (path: string) => {
  window.location.hash = '#/' + path.replace(/^\//, '')
}
