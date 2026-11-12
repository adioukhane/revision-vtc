import { useEffect, useState } from 'react'
import Bilan from './Bilan'
import Home from './Home'
import Quiz from './Quiz'
import Setup from './Setup'
import { StoreProvider, useRoute } from './store'
import type { Mode } from './types'

const MODES: Mode[] = ['aleatoire', 'examen', 'entrainement', 'erreurs', 'ouvertes']

function Routes({ theme, basculerTheme }: { theme: string; basculerTheme: () => void }) {
  const [page, arg] = useRoute()
  if (page === 'session' && arg) return <Quiz id={arg} />
  if (page === 'bilan' && arg) return <Bilan id={arg} />
  if (page === 'nouveau' && MODES.includes(arg as Mode)) return <Setup key={arg} mode={arg as Mode} />
  return <Home theme={theme} basculerTheme={basculerTheme} />
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('revision-vtc:theme') ?? 'sombre')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('revision-vtc:theme', theme)
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'sombre' ? '#0f1115' : '#f6f7f9')
  }, [theme])
  return (
    <StoreProvider>
      <Routes theme={theme} basculerTheme={() => setTheme((t) => (t === 'sombre' ? 'clair' : 'sombre'))} />
    </StoreProvider>
  )
}
