import { useState } from 'react'
import { asset, NOM_EPREUVE, TMAP } from './data'
import { fmtPts, qcmDetail } from './logic'
import type { Question, Session, Store } from './types'
import { aller } from './store'

export function Origine({ q }: { q: Question }) {
  return (
    <div className="origine">
      <span className={`badge ep-${q.epreuve}`}>{q.epreuve}</span>
      <span>
        {q.annee} · {NOM_EPREUVE[q.epreuve]} · Q{q.numero}
      </span>
      <span className="pts">{fmtPts(q.points)}</span>
    </div>
  )
}

export function Zoom({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [grand, setGrand] = useState(false)
  return (
    <div className="zoom" role="dialog" aria-label={alt}>
      <div className="zoom-barre">
        <button className="btn petit" onClick={() => setGrand((g) => !g)}>
          {grand ? 'Ajuster à l’écran' : 'Agrandir'}
        </button>
        <button className="btn petit" onClick={onClose}>
          Fermer ✕
        </button>
      </div>
      <div className="zoom-zone">
        <img src={src} alt={alt} style={{ width: grand ? '220%' : '100%', maxWidth: 'none' }} />
      </div>
    </div>
  )
}

export function TexteSupport({ id }: { id: string }) {
  const t = TMAP[id]
  const [ouvert, setOuvert] = useState(false)
  const [zoom, setZoom] = useState(false)
  if (!t) return null
  return (
    <div className="texte-support">
      <button className="btn secondaire plein" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        📄 {ouvert ? 'Masquer le texte' : 'Lire le texte support'}
      </button>
      {ouvert && (
        <div className="texte-contenu">
          {t.image ? (
            <>
              <img src={asset(t.image)} alt={`Texte support ${t.annee}`} onClick={() => setZoom(true)} />
              <button className="btn petit" onClick={() => setZoom(true)}>
                🔍 Ouvrir en plein écran
              </button>
            </>
          ) : (
            <>
              {t.titre && <h3>{t.titre}</h3>}
              {t.texte?.split('\n').map((p, i) => <p key={i}>{p}</p>)}
            </>
          )}
        </div>
      )}
      {zoom && t.image && <Zoom src={asset(t.image)} alt="Texte support" onClose={() => setZoom(false)} />}
    </div>
  )
}

export function Enonce({ q }: { q: Question }) {
  const [zoom, setZoom] = useState(false)
  return (
    <>
      {q.texteSupportId && <TexteSupport id={q.texteSupportId} />}
      {q.image && (
        <>
          <img className="q-image" src={asset(q.image)} alt="Illustration de la question" onClick={() => setZoom(true)} />
          {zoom && <Zoom src={asset(q.image)} alt="Illustration" onClose={() => setZoom(false)} />}
        </>
      )}
      <p className="enonce">{q.enonce}</p>
    </>
  )
}

export function Note({ q }: { q: Question }) {
  if (!q.note) return null
  return <div className={`note ${q.obsolete ? 'note-obsolete' : ''}`}>{q.note}</div>
}

/** Options d'un QCM avec la correction : bonne cochée / oubliée / cochée à tort. */
export function CorrectionQcm({ q, selection }: { q: Question; selection?: string[] }) {
  const d = qcmDetail(q, selection)
  return (
    <>
      <ul className="options correction">
        {q.options.map((o) => {
          const etat = d.justes.includes(o.lettre)
            ? 'juste'
            : d.oublies.includes(o.lettre)
              ? 'oublie'
              : d.aTort.includes(o.lettre)
                ? 'atort'
                : 'neutre'
          const coche = selection?.includes(o.lettre)
          return (
            <li key={o.lettre} className={`option ${etat}`}>
              <span className="case" aria-hidden>
                {coche ? '☑' : '☐'}
              </span>
              <span className="lettre">{o.lettre}</span>
              <span className="texte">
                {o.texte}
                {etat === 'juste' && <em className="etiquette">✓ bonne réponse cochée</em>}
                {etat === 'oublie' && <em className="etiquette">⚠ oublié de cocher</em>}
                {etat === 'atort' && <em className="etiquette">✗ coché à tort</em>}
              </span>
            </li>
          )
        })}
      </ul>
      <p className={`verdict ${d.correct ? 'ok' : 'ko'}`}>
        {d.correct ? '✓ Juste' : '✗ Faux'} — ta réponse : {selection?.length ? [...selection].sort().join(', ') : 'aucune case'} ·
        bonne réponse : {q.bonnes.join(', ')}
        {d.oublies.length > 0 && <> · oublié : {d.oublies.join(', ')}</>}
        {d.aTort.length > 0 && <> · coché à tort : {d.aTort.join(', ')}</>}
      </p>
    </>
  )
}

/** Remplace la session en cours par une nouvelle et l'ouvre. */
export function demarrer(setStore: (f: (s: Store) => Store) => void, s: Session) {
  setStore((st) => ({
    ...st,
    sessions: [...st.sessions.filter((x) => x.terminee || x.id !== st.courante), s],
    courante: s.id,
  }))
  aller(`session/${s.id}`)
}

export function Entete({ titre, retour = '' }: { titre: string; retour?: string }) {
  return (
    <header className="entete">
      <button className="btn lien" onClick={() => aller(retour)} aria-label="Retour">
        ← Retour
      </button>
      <h1>{titre}</h1>
    </header>
  )
}
