import { useMemo, useState } from 'react'
import { demarrer, Entete } from './components'
import { ANNEES, DUREES_DEFAUT, EPREUVES, NOM_EPREUVE, QMAP, QUESTIONS } from './data'
import { calculerStats, melanger, nouvelleSession, trierExamen } from './logic'
import { useStore } from './store'
import type { Epreuve, Mode } from './types'

function Puces<T extends string | number>({
  valeurs,
  choisis,
  onChange,
  libelle,
}: {
  valeurs: T[]
  choisis: T[]
  onChange: (v: T[]) => void
  libelle: (v: T) => string
}) {
  const tout = valeurs.every((v) => choisis.includes(v))
  return (
    <div className="puces">
      {valeurs.map((v) => {
        const on = choisis.includes(v)
        return (
          <button
            key={v}
            className={`puce ${on ? 'on' : ''}`}
            aria-pressed={on}
            onClick={() => onChange(on ? choisis.filter((x) => x !== v) : [...choisis, v])}
          >
            {libelle(v)}
          </button>
        )
      })}
      <button className="puce lien" onClick={() => onChange(tout ? [] : [...valeurs])}>
        {tout ? 'Aucune' : 'Toutes'}
      </button>
    </div>
  )
}

const libEp = (e: Epreuve) => `${e} · ${NOM_EPREUVE[e]}`

export default function Setup({ mode }: { mode: Mode }) {
  const { store, setStore } = useStore()
  const epreuvesDispo =
    mode === 'ouvertes' ? EPREUVES.filter((e) => QUESTIONS.some((q) => q.epreuve === e && q.type === 'ouverte')) : EPREUVES
  const [epreuves, setEpreuves] = useState<Epreuve[]>([...epreuvesDispo])
  const [annees, setAnnees] = useState<number[]>([...ANNEES])
  const [n, setN] = useState(20)
  const [annee, setAnnee] = useState(ANNEES[ANNEES.length - 1])
  const [durees, setDurees] = useState<Record<Epreuve, number>>({ ...DUREES_DEFAUT, ...store.prefs.durees })

  const enCours = store.sessions.find((s) => s.id === store.courante && !s.terminee)
  const lancer = (s: ReturnType<typeof nouvelleSession>) => {
    if (enCours && !confirm('Une session est déjà en cours. La remplacer ? (elle sera perdue)')) return
    demarrer(setStore, s)
  }

  const filtrees = useMemo(
    () =>
      QUESTIONS.filter(
        (q) => epreuves.includes(q.epreuve) && annees.includes(q.annee) && (mode !== 'ouvertes' || q.type === 'ouverte'),
      ),
    [epreuves, annees, mode],
  )
  const erreurs = useMemo(() => {
    const st = calculerStats(store, QMAP)
    return QUESTIONS.filter((q) => st[q.id]?.enErreur).map((q) => q.id)
  }, [store])

  if (mode === 'aleatoire') {
    return (
      <main className="page">
        <Entete titre="Mélange aléatoire" />
        <div className="carte">
          <p>Des questions tirées au hasard dans toutes les annales (2019 à 2022), toutes épreuves confondues.</p>
          <h3>Nombre de questions</h3>
          <div className="puces">
            {[20, 50, 100].map((v) => (
              <button key={v} className={`puce grosse ${n === v ? 'on' : ''}`} aria-pressed={n === v} onClick={() => setN(v)}>
                {v}
              </button>
            ))}
          </div>
          <button
            className="btn principal plein"
            onClick={() => lancer(nouvelleSession('aleatoire', `Mélange aléatoire (${n})`, melanger(QUESTIONS).slice(0, n).map((q) => q.id)))}
          >
            Commencer ({n} questions)
          </button>
        </div>
      </main>
    )
  }

  if (mode === 'examen') {
    const qs = trierExamen(QUESTIONS.filter((q) => q.annee === annee))
    return (
      <main className="page">
        <Entete titre="Examen blanc" />
        <div className="carte">
          <p>Une annale complète, épreuve par épreuve, dans l’ordre de l’examen, avec un chrono par épreuve. Pas de correction avant la fin.</p>
          <h3>Année</h3>
          <div className="puces">
            {ANNEES.map((y) => (
              <button key={y} className={`puce grosse ${annee === y ? 'on' : ''}`} aria-pressed={annee === y} onClick={() => setAnnee(y)}>
                {y}
              </button>
            ))}
          </div>
          <h3>Durée de chaque épreuve (minutes)</h3>
          <p className="discret">Durées indicatives : vérifie-les sur ta convocation.</p>
          <div className="durees">
            {EPREUVES.map((e) => (
              <label key={e} className="duree">
                <span>
                  <span className={`badge ep-${e}`}>{e}</span> {NOM_EPREUVE[e]}{' '}
                  <span className="discret">({qs.filter((q) => q.epreuve === e).length} q.)</span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  inputMode="numeric"
                  value={durees[e]}
                  onChange={(ev) => setDurees({ ...durees, [e]: Math.max(1, Number(ev.target.value) || 1) })}
                />
              </label>
            ))}
          </div>
          <button
            className="btn principal plein"
            onClick={() => {
              setStore((st) => ({ ...st, prefs: { ...st.prefs, durees } }))
              lancer(
                nouvelleSession(
                  'examen',
                  `Examen blanc ${annee}`,
                  qs.map((q) => q.id),
                  { examen: { annee, epreuves: [...EPREUVES], durees, etape: 0 } },
                ),
              )
            }}
          >
            Commencer l’examen {annee} ({qs.length} questions)
          </button>
        </div>
      </main>
    )
  }

  if (mode === 'erreurs') {
    return (
      <main className="page">
        <Entete titre="Mes erreurs" />
        <div className="carte">
          <p>
            Les questions que tu as ratées. Chacune revient jusqu’à ce que tu l’aies réussie <strong>2 fois de suite</strong>. Les
            questions ouvertes y entrent quand ta note est sous la moitié du barème.
          </p>
          <p className="gros-chiffre">{erreurs.length}</p>
          <p className="centre">question{erreurs.length > 1 ? 's' : ''} à retravailler</p>
          <button
            className="btn principal plein"
            disabled={erreurs.length === 0}
            onClick={() => lancer(nouvelleSession('erreurs', `Mes erreurs (${erreurs.length})`, melanger(erreurs)))}
          >
            {erreurs.length ? 'Commencer' : 'Rien à revoir pour l’instant'}
          </button>
        </div>
      </main>
    )
  }

  // entraînement par épreuve et questions ouvertes
  const titre = mode === 'ouvertes' ? 'Questions ouvertes' : 'Entraînement par épreuve'
  return (
    <main className="page">
      <Entete titre={titre} />
      <div className="carte">
        <p>
          {mode === 'ouvertes'
            ? 'Uniquement les questions ouvertes, pour les apprendre par cœur (beaucoup reviennent chaque année). Notes et corrigés dans le bilan.'
            : 'Choisis une ou plusieurs épreuves et années. Les questions sont mélangées.'}
        </p>
        <h3>Épreuves</h3>
        <Puces valeurs={epreuvesDispo} choisis={epreuves} onChange={setEpreuves} libelle={libEp} />
        <h3>Années</h3>
        <Puces valeurs={ANNEES} choisis={annees} onChange={setAnnees} libelle={String} />
        <button
          className="btn principal plein"
          disabled={filtrees.length === 0}
          onClick={() =>
            lancer(
              nouvelleSession(
                mode,
                `${titre} · ${epreuves.length === EPREUVES.length ? 'toutes épreuves' : [...epreuves].sort().join(', ')}`,
                melanger(filtrees).map((q) => q.id),
              ),
            )
          }
        >
          Commencer ({filtrees.length} questions)
        </button>
      </div>
    </main>
  )
}
