import { useEffect, useMemo, useState } from 'react'
import { CorrectionQcm, Enonce, Note, Origine } from './components'
import { NOM_EPREUVE, QMAP } from './data'
import { NOM_MODE, terminerSession } from './logic'
import { aller, useStore } from './store'
import type { Answer, Session } from './types'

function useMaintenant(actif: boolean) {
  const [t, setT] = useState(Date.now())
  useEffect(() => {
    if (!actif) return
    setT(Date.now())
    const i = setInterval(() => setT(Date.now()), 500)
    return () => clearInterval(i)
  }, [actif])
  return t
}

const fmtChrono = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Quiz({ id }: { id: string }) {
  const { store, majSession, setStore } = useStore()
  const s = store.sessions.find((x) => x.id === id)

  useEffect(() => {
    if (s?.terminee) aller(`bilan/${s.id}`)
  }, [s?.terminee, s?.id])

  if (!s) {
    return (
      <main className="page">
        <p>Session introuvable.</p>
        <button className="btn" onClick={() => aller('')}>
          Accueil
        </button>
      </main>
    )
  }
  if (s.terminee) return null
  return <QuizSession s={s} majSession={majSession} setStore={setStore} />
}

function QuizSession({
  s,
  majSession,
  setStore,
}: {
  s: Session
  majSession: ReturnType<typeof useStore>['majSession']
  setStore: ReturnType<typeof useStore>['setStore']
}) {
  const exam = s.examen
  const epreuveCourante = exam ? exam.epreuves[exam.etape] : null
  // bornes de navigation : l'épreuve en cours pour l'examen blanc, toute la session sinon
  const [debut, fin] = useMemo(() => {
    if (!epreuveCourante) return [0, s.questionIds.length - 1]
    const idx = s.questionIds.map((id, i) => [QMAP[id]?.epreuve, i] as const).filter(([e]) => e === epreuveCourante)
    return [idx[0][1], idx[idx.length - 1][1]]
  }, [s.questionIds, epreuveCourante])

  const enIntro = !!exam && exam.finEtape === undefined
  const maintenant = useMaintenant(!!exam && !enIntro)
  const reste = exam?.finEtape !== undefined ? exam.finEtape - maintenant : 0

  const index = Math.min(Math.max(s.index, debut), fin)
  const qid = s.questionIds[index]
  const q = QMAP[qid]
  const a: Answer = s.answers[qid] ?? {}

  const maj = (f: (s: Session) => Session) => majSession(s.id, f)
  const majReponse = (r: Partial<Answer>) =>
    maj((x) => ({ ...x, answers: { ...x.answers, [qid]: { ...x.answers[qid], ...r } } }))

  // la question est « vue » dès qu'elle est affichée
  useEffect(() => {
    if (!enIntro && qid && !(qid in s.answers)) majReponse({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid, enIntro])

  const terminer = () => {
    majSession(s.id, terminerSession)
    setStore((st) => ({ ...st, courante: undefined }))
    aller(`bilan/${s.id}`)
  }

  const passerEtape = () => {
    if (!exam) return
    if (exam.etape + 1 >= exam.epreuves.length) return terminer()
    const suivante = exam.epreuves[exam.etape + 1]
    const premier = s.questionIds.findIndex((id) => QMAP[id]?.epreuve === suivante)
    maj((x) => ({ ...x, index: premier, examen: { ...x.examen!, etape: x.examen!.etape + 1, finEtape: undefined } }))
  }

  // fin du chrono : on passe automatiquement à l'épreuve suivante
  useEffect(() => {
    if (exam && !enIntro && reste <= 0) passerEtape()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reste <= 0, enIntro])

  if (exam && enIntro && epreuveCourante) {
    const nb = fin - debut + 1
    return (
      <main className="page">
        <div className="carte intro-epreuve">
          <p className="petit-titre">
            Examen blanc {exam.annee} · épreuve {exam.etape + 1}/{exam.epreuves.length}
          </p>
          <h1>
            <span className={`badge grand ep-${epreuveCourante}`}>{epreuveCourante}</span> {NOM_EPREUVE[epreuveCourante]}
          </h1>
          <p>
            {nb} questions · {exam.durees[epreuveCourante]} minute{exam.durees[epreuveCourante] > 1 ? 's' : ''}
          </p>
          <p className="discret">Le chrono démarre quand tu appuies sur « Commencer ». À zéro, l’épreuve se termine toute seule.</p>
          <button
            className="btn principal plein"
            onClick={() =>
              maj((x) => ({ ...x, examen: { ...x.examen!, finEtape: Date.now() + x.examen!.durees[epreuveCourante] * 60000 } }))
            }
          >
            Commencer l’épreuve {epreuveCourante}
          </button>
          <button className="btn lien" onClick={() => aller('')}>
            Revenir à l’accueil (la session reste en cours)
          </button>
        </div>
      </main>
    )
  }

  if (!q) return null
  const pos = index - debut + 1
  const total = fin - debut + 1
  const dernier = index === fin
  const montrerCorrection = s.feedbackImmediat && q.type === 'qcm' && a.valide

  const aller_ = (i: number) => maj((x) => ({ ...x, index: i }))
  const suivant = () => {
    if (!dernier) return aller_(index + 1)
    if (exam) {
      if (confirm(`Terminer l’épreuve ${epreuveCourante} maintenant ?`)) passerEtape()
    } else terminer()
  }

  return (
    <main className="page quiz">
      <div className="quiz-barre">
        <button className="btn lien" onClick={() => aller('')}>
          ← Accueil
        </button>
        <span className="quiz-titre">{exam ? `Épreuve ${epreuveCourante}` : NOM_MODE[s.mode]}</span>
        {exam ? (
          <span className={`chrono ${reste < 60000 ? 'urgent' : ''}`} aria-live="off">
            ⏱ {fmtChrono(reste)}
          </span>
        ) : (
          <button
            className="btn lien"
            onClick={() => confirm('Arrêter la session et voir le bilan ? Les questions pas encore affichées ne seront pas comptées.') && terminer()}
          >
            Arrêter
          </button>
        )}
      </div>
      <div className="progression" aria-label={`Question ${pos} sur ${total}`}>
        <div style={{ width: `${(100 * pos) / total}%` }} />
      </div>
      <p className="compteur">
        Question {pos} / {total}
      </p>

      <article className="carte question">
        <Origine q={q} />
        <Enonce q={q} />

        {q.type === 'qcm' && !montrerCorrection && (
          <ul className="options">
            {q.options.map((o) => {
              const coche = a.selection?.includes(o.lettre) ?? false
              return (
                <li key={o.lettre}>
                  <label className={`option choix ${coche ? 'coche' : ''}`}>
                    <input
                      type="checkbox"
                      checked={coche}
                      onChange={() => {
                        const sel = new Set(a.selection ?? [])
                        if (sel.has(o.lettre)) sel.delete(o.lettre)
                        else sel.add(o.lettre)
                        majReponse({ selection: [...sel].sort() })
                      }}
                    />
                    <span className="lettre">{o.lettre}</span>
                    <span className="texte">{o.texte}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        {montrerCorrection && (
          <>
            <CorrectionQcm q={q} selection={a.selection} />
            <Note q={q} />
          </>
        )}

        {q.type === 'ouverte' && (
          <>
            <textarea
              className="reponse"
              rows={6}
              placeholder="Tape ta réponse…"
              value={a.texte ?? ''}
              onChange={(e) => majReponse({ texte: e.target.value })}
            />
            <p className="discret">Le corrigé officiel sera disponible dans le bilan, une fois ta note saisie.</p>
          </>
        )}
      </article>

      <nav className="quiz-nav">
        <button className="btn secondaire" disabled={index === debut} onClick={() => aller_(index - 1)}>
          ← Précédente
        </button>
        {s.feedbackImmediat && q.type === 'qcm' && !a.valide ? (
          <button className="btn principal" onClick={() => majReponse({ valide: true, selection: a.selection ?? [] })}>
            Valider
          </button>
        ) : (
          <button className="btn principal" onClick={suivant}>
            {dernier ? (exam ? (exam.etape + 1 < exam.epreuves.length ? 'Épreuve suivante →' : 'Voir le bilan') : 'Voir le bilan') : 'Suivante →'}
          </button>
        )}
      </nav>
      {exam && !dernier && (
        <button className="btn lien centre" onClick={() => confirm(`Terminer l’épreuve ${epreuveCourante} maintenant ?`) && passerEtape()}>
          Terminer l’épreuve {epreuveCourante} maintenant
        </button>
      )}
    </main>
  )
}
