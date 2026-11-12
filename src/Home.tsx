import { useEffect, useMemo, useState } from 'react'
import { ANNEES, EPREUVES, NOM_EPREUVE, QMAP, QUESTIONS } from './data'
import { fmtNombre, NOM_MODE, scoreSession, statsGlobales } from './logic'
import { aller, useStore } from './store'
import type { Mode } from './types'

/** Prochain 18 novembre (jour de l'examen), à 8 h. */
function dateExamen(maintenant: Date) {
  const d = new Date(maintenant.getFullYear(), 10, 18, 8, 0, 0)
  if (maintenant.getTime() > new Date(maintenant.getFullYear(), 10, 18, 23, 59).getTime()) d.setFullYear(d.getFullYear() + 1)
  return d
}

function CompteARebours() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(i)
  }, [])
  const cible = dateExamen(now)
  const ms = cible.getTime() - now.getTime()
  const jourJ = cible.toDateString() === now.toDateString()
  const jours = Math.floor(ms / 86400000)
  const heures = Math.floor((ms % 86400000) / 3600000)
  return (
    <section className="carte rebours">
      {jourJ ? (
        <p className="rebours-j">C’est le jour J. Bonne chance ! 🍀</p>
      ) : (
        <>
          <p className="rebours-j">
            J-
            {Math.round(
              (new Date(cible.getFullYear(), cible.getMonth(), cible.getDate()).getTime() -
                new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
                86400000,
            )}
          </p>
          <p>
            {jours} jour{jours > 1 ? 's' : ''} et {heures} h avant l’examen théorique du{' '}
            {cible.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </>
      )}
    </section>
  )
}

const MODES: { mode: Mode; icone: string; desc: string }[] = [
  { mode: 'aleatoire', icone: '🎲', desc: '20, 50 ou 100 questions de toutes les annales' },
  { mode: 'examen', icone: '⏱', desc: 'Une annale complète, épreuve par épreuve, chronométrée' },
  { mode: 'entrainement', icone: '🎯', desc: 'Les épreuves et années de ton choix' },
  { mode: 'erreurs', icone: '🔁', desc: 'Jusqu’à 2 réussites de suite' },
  { mode: 'ouvertes', icone: '✍️', desc: 'Pour apprendre les corrigés par cœur' },
]

const pct = (v: number | null) => (v === null ? '—' : `${fmtNombre(v, 0)} %`)

export default function Home({ theme, basculerTheme }: { theme: string; basculerTheme: () => void }) {
  const { store, reinitialiser } = useStore()
  const st = useMemo(() => statsGlobales(store, QUESTIONS, QMAP), [store])
  const enCours = store.sessions.find((s) => s.id === store.courante && !s.terminee)
  const historique = store.sessions.filter((s) => s.terminee).sort((a, b) => b.date.localeCompare(a.date))
  const [toutHisto, setToutHisto] = useState(false)

  return (
    <main className="page accueil">
      <header className="entete-accueil">
        <div>
          <h1>Révision VTC</h1>
          <p className="discret">Annales CMA 2019 – 2022 · {QUESTIONS.length} questions</p>
        </div>
        <button className="btn petit" onClick={basculerTheme} aria-label="Changer de thème">
          {theme === 'sombre' ? '☀️' : '🌙'}
        </button>
      </header>

      <CompteARebours />

      {enCours && (
        <button className="carte reprendre" onClick={() => aller(`session/${enCours.id}`)}>
          <strong>▶ Reprendre la session en cours</strong>
          <span>
            {enCours.titre} · {Object.keys(enCours.answers).length}/{enCours.questionIds.length} vues
          </span>
        </button>
      )}

      <section className="modes">
        {MODES.map((m) => (
          <button key={m.mode} className="carte mode" onClick={() => aller(`nouveau/${m.mode}`)}>
            <span className="mode-icone">{m.icone}</span>
            <span>
              <strong>{NOM_MODE[m.mode]}</strong>
              <span className="discret">
                {m.mode === 'erreurs' ? `${st.erreurs.length} question${st.erreurs.length > 1 ? 's' : ''} · ` : ''}
                {m.desc}
              </span>
            </span>
          </button>
        ))}
      </section>

      <section className="carte">
        <h2>Statistiques</h2>
        <div className="chiffres">
          <div>
            <span className="chiffre">{pct(st.global.pct)}</span>
            <span className="discret">réussite globale</span>
          </div>
          <div>
            <span className="chiffre">{st.jamaisVues}</span>
            <span className="discret">questions jamais vues</span>
          </div>
          <div>
            <span className="chiffre">{st.erreurs.length}</span>
            <span className="discret">dans « Mes erreurs »</span>
          </div>
        </div>

        {st.plusFaible && (
          <button className="faible-alerte" onClick={() => aller('nouveau/entrainement')}>
            ⚠️ Épreuve la plus faible : <strong>{st.plusFaible} · {NOM_EPREUVE[st.plusFaible]}</strong> (
            {pct(st.parEpreuve[st.plusFaible].pct)}). Entraîne-toi dessus →
          </button>
        )}

        <h3>Par épreuve</h3>
        <ul className="barres">
          {EPREUVES.map((e) => {
            const t = st.parEpreuve[e]
            const p = t?.pct ?? null
            return (
              <li key={e} className={e === st.plusFaible ? 'plus-faible' : ''}>
                <span className="barre-lib">
                  <span className={`badge ep-${e}`}>{e}</span> {NOM_EPREUVE[e]}
                </span>
                <span className="barre">
                  <span style={{ width: `${p ?? 0}%` }} className={p !== null && p < 50 ? 'rouge' : ''} />
                </span>
                <span className="barre-val">{pct(p)}</span>
              </li>
            )
          })}
        </ul>
        <h3>Par année</h3>
        <ul className="barres">
          {ANNEES.map((y) => {
            const p = st.parAnnee[y]?.pct ?? null
            return (
              <li key={y}>
                <span className="barre-lib">{y}</span>
                <span className="barre">
                  <span style={{ width: `${p ?? 0}%` }} className={p !== null && p < 50 ? 'rouge' : ''} />
                </span>
                <span className="barre-val">{pct(p)}</span>
              </li>
            )
          })}
        </ul>
        <p className="discret">Taux calculés en points (barème réel) sur toutes tes réponses notées.</p>
      </section>

      <section className="carte">
        <h2>Historique</h2>
        {historique.length === 0 && <p className="discret">Aucune session terminée pour l’instant.</p>}
        <ul className="historique">
          {(toutHisto ? historique : historique.slice(0, 10)).map((s) => {
            const sc = scoreSession(s, QMAP).global
            return (
              <li key={s.id}>
                <button onClick={() => aller(`bilan/${s.id}`)}>
                  <span className="h-date">{new Date(s.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="h-titre">{s.titre || NOM_MODE[s.mode]}</span>
                  <span className="h-score">
                    {fmtNombre(sc.sur20, 2)}/20
                    {sc.provisoire && <span className="mini-attente"> · {sc.enAttente} note{sc.enAttente > 1 ? 's' : ''} en attente</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {historique.length > 10 && (
          <button className="btn lien" onClick={() => setToutHisto((v) => !v)}>
            {toutHisto ? 'Afficher moins' : `Afficher tout (${historique.length})`}
          </button>
        )}
      </section>

      <section className="reinit">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Effacer toute ta progression (historique, erreurs, statistiques) ? Action irréversible.')) reinitialiser()
          }}
        >
          Réinitialiser ma progression
        </button>
        <p className="discret">Ta progression est enregistrée uniquement sur cet appareil (localStorage).</p>
      </section>
    </main>
  )
}
