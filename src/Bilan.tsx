import { useState } from 'react'
import { CorrectionQcm, demarrer, Enonce, Note, Origine } from './components'
import { EPREUVES, NOM_EPREUVE, QMAP } from './data'
import {
  fmtNombre,
  fmtPts,
  melanger,
  NOM_MODE,
  normaliserNote,
  nouvelleSession,
  ouvertesIds,
  rateesIds,
  resultat,
  scoreSession,
  texteCorrection,
} from './logic'
import { aller, useStore } from './store'
import type { Question, Session } from './types'

async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte)
    return true
  } catch {
    // repli pour les navigateurs sans accès au presse-papier (http, anciens mobiles)
    const ta = document.createElement('textarea')
    ta.value = texte
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export default function Bilan({ id }: { id: string }) {
  const { store, majSession, setStore } = useStore()
  const s = store.sessions.find((x) => x.id === id)
  const [copie, setCopie] = useState<'' | 'ok' | 'ko'>('')
  const [apercu, setApercu] = useState(false)

  if (!s || !s.terminee) {
    return (
      <main className="page">
        <p>Bilan introuvable.</p>
        <button className="btn" onClick={() => aller('')}>
          Accueil
        </button>
      </main>
    )
  }

  const sc = scoreSession(s, QMAP)
  const ratees = rateesIds(s, QMAP)
  const ouvertes = ouvertesIds(s, QMAP)
  const g = sc.global
  const export_ = texteCorrection(s, QMAP)

  const noter = (qid: string, note: number | null) =>
    majSession(s.id, (x) => ({ ...x, answers: { ...x.answers, [qid]: { ...x.answers[qid], note } } }))

  return (
    <main className="page bilan">
      <header className="entete">
        <button className="btn lien" onClick={() => aller('')}>
          ← Accueil
        </button>
        <h1>Bilan</h1>
      </header>
      <p className="discret">
        {s.titre || NOM_MODE[s.mode]} · {new Date(s.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
        {s.questionIds.length} questions
      </p>

      <section className="carte score">
        <div className="score-principal">
          <span className="score-note">{fmtNombre(g.sur20, 2)}</span>
          <span className="score-sur">/ 20</span>
          <span className="score-pct">{fmtNombre(g.pct, 0)} %</span>
        </div>
        <p className="discret">
          {fmtNombre(g.obtenus)} / {fmtNombre(g.max)} points (barème réel)
        </p>
        {g.provisoire && (
          <p className="provisoire">
            Score provisoire : {g.enAttente} question{g.enAttente > 1 ? 's' : ''} ouverte{g.enAttente > 1 ? 's' : ''} en attente de
            note (comptée{g.enAttente > 1 ? 's' : ''} 0 pour l’instant).
          </p>
        )}
        <table className="table-epreuves">
          <thead>
            <tr>
              <th>Épreuve</th>
              <th>Points</th>
              <th>/ 20</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            {EPREUVES.filter((e) => sc.parEpreuve[e]).map((e) => {
              const x = sc.parEpreuve[e]!
              return (
                <tr key={e} className={x.pct < 50 ? 'faible' : ''}>
                  <td>
                    <span className={`badge ep-${e}`}>{e}</span> {NOM_EPREUVE[e]}
                    {x.provisoire && <span className="mini-attente"> · provisoire</span>}
                  </td>
                  <td>
                    {fmtNombre(x.obtenus)}/{fmtNombre(x.max)}
                  </td>
                  <td>{fmtNombre(x.sur20, 2)}</td>
                  <td>{fmtNombre(x.pct, 0)} %</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {ouvertes.length > 0 && (
        <section className="carte">
          <h2>Questions ouvertes ({ouvertes.length})</h2>
          <p className="discret">
            Copie tes réponses, fais-les corriger, puis saisis la note obtenue pour chaque question (demi-points acceptés).
          </p>
          <button
            className="btn principal plein"
            onClick={async () => {
              setCopie((await copier(export_)) ? 'ok' : 'ko')
              setTimeout(() => setCopie(''), 3000)
            }}
          >
            {copie === 'ok' ? '✓ Copié dans le presse-papier' : copie === 'ko' ? 'Copie impossible : sélectionne le texte ci-dessous' : '📋 Copier pour correction'}
          </button>
          <button className="btn lien" onClick={() => setApercu((v) => !v)}>
            {apercu || copie === 'ko' ? 'Masquer le texte copié' : 'Voir le texte copié'}
          </button>
          {(apercu || copie === 'ko') && <textarea className="apercu" readOnly value={export_} rows={10} onFocus={(e) => e.target.select()} />}
          {ouvertes.map((qid) => (
            <OuverteANoter key={qid} q={QMAP[qid]} s={s} onNote={(n) => noter(qid, n)} />
          ))}
        </section>
      )}

      <section className="carte">
        <h2>Questions ratées ({ratees.length})</h2>
        {ratees.length === 0 && <p>Aucune question ratée{g.provisoire ? ' pour l’instant (notes en attente)' : ''}. 🎉</p>}
        {ratees.map((qid) => (
          <Ratee key={qid} q={QMAP[qid]} s={s} />
        ))}
      </section>

      <div className="actions-bas">
        {ratees.length > 0 && (
          <button
            className="btn principal plein"
            onClick={() =>
              demarrer(setStore, nouvelleSession('refaire', `Refaire les ratées (${ratees.length})`, melanger(ratees)))
            }
          >
            🔁 Refaire uniquement ces questions
          </button>
        )}
        <button className="btn secondaire plein" onClick={() => aller('')}>
          Retour à l’accueil
        </button>
      </div>
    </main>
  )
}

function OuverteANoter({ q, s, onNote }: { q: Question; s: Session; onNote: (n: number | null) => void }) {
  const a = s.answers[q.id] ?? {}
  const notee = a.note !== undefined && a.note !== null
  const [saisie, setSaisie] = useState(notee ? String(a.note).replace('.', ',') : '')
  const [edition, setEdition] = useState(!notee)
  const [corrige, setCorrige] = useState(false)
  const [erreur, setErreur] = useState('')
  const r = resultat(q, a)

  const enregistrer = () => {
    const v = Number(saisie.replace(',', '.').trim())
    if (saisie.trim() === '' || Number.isNaN(v) || v < 0 || v > q.points) {
      setErreur(`Saisis une note entre 0 et ${fmtNombre(q.points)}.`)
      return
    }
    const n = normaliserNote(v, q.points)
    setSaisie(String(n).replace('.', ','))
    setErreur('')
    setEdition(false)
    onNote(n)
  }

  return (
    <div className={`ouverte statut-${r.statut}`} data-qid={q.id}>
      <Origine q={q} />
      <p className="enonce">{q.enonce}</p>
      <div className="bloc-reponse">
        <h4>Ma réponse</h4>
        <p className="pre">{a.texte?.trim() || <em>(pas de réponse)</em>}</p>
      </div>
      {edition ? (
        <div className="saisie-note">
          <label>
            Note obtenue
            <input
              inputMode="decimal"
              value={saisie}
              placeholder="ex. 1,5"
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enregistrer()}
              aria-label={`Note sur ${q.points}`}
            />
            <span>/ {fmtNombre(q.points)}</span>
          </label>
          <button className="btn principal" onClick={enregistrer}>
            Enregistrer
          </button>
          {erreur && <p className="erreur">{erreur}</p>}
        </div>
      ) : (
        <div className="note-saisie">
          <span className={`pastille-note ${r.statut}`}>
            Note : {fmtNombre(a.note ?? 0)} / {fmtNombre(q.points)}
            {r.statut === 'ratee' ? ' · à revoir' : ''}
          </span>
          <button className="btn petit" onClick={() => setEdition(true)}>
            Modifier
          </button>
          <button className="btn petit" onClick={() => setCorrige((c) => !c)}>
            {corrige ? 'Masquer le corrigé' : 'Voir le corrigé officiel'}
          </button>
        </div>
      )}
      {!edition && corrige && (
        <div className="comparaison">
          <div>
            <h4>Ma réponse</h4>
            <p className="pre">{a.texte?.trim() || '(pas de réponse)'}</p>
          </div>
          <div className="corrige">
            <h4>Corrigé officiel</h4>
            <p className="pre">{q.corrige}</p>
          </div>
        </div>
      )}
      {!edition && corrige && <Note q={q} />}
      {r.statut === 'attente' && <p className="mini-attente">En attente de note</p>}
    </div>
  )
}

function Ratee({ q, s }: { q: Question; s: Session }) {
  const a = s.answers[q.id] ?? {}
  return (
    <div className="ratee">
      <Origine q={q} />
      {q.obsolete && <p className="obsolete">Règle obsolète : erreur non grave, pas ajoutée à « Mes erreurs ».</p>}
      <Enonce q={q} />
      {q.type === 'qcm' ? (
        <CorrectionQcm q={q} selection={a.selection} />
      ) : (
        <div className="comparaison">
          <div>
            <h4>Ma réponse ({fmtNombre(a.note ?? 0)} / {fmtPts(q.points)})</h4>
            <p className="pre">{a.texte?.trim() || '(pas de réponse)'}</p>
          </div>
          <div className="corrige">
            <h4>Corrigé officiel</h4>
            <p className="pre">{q.corrige}</p>
          </div>
        </div>
      )}
      <Note q={q} />
    </div>
  )
}
