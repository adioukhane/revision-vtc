import type { Answer, Epreuve, Mode, Question, Session, Store } from './types'

/* ------------------------------------------------------------------ */
/* Correction                                                          */
/* ------------------------------------------------------------------ */

export interface QcmDetail {
  /** bonnes réponses cochées */
  justes: string[]
  /** bonnes réponses non cochées */
  oublies: string[]
  /** mauvaises réponses cochées */
  aTort: string[]
  correct: boolean
}

/** Juste uniquement si exactement toutes les bonnes réponses sont cochées et aucune mauvaise. */
export function qcmDetail(q: Question, selection: string[] = []): QcmDetail {
  const sel = new Set(selection)
  const bonnes = new Set(q.bonnes)
  const justes = q.bonnes.filter((l) => sel.has(l))
  const oublies = q.bonnes.filter((l) => !sel.has(l))
  const aTort = q.options.map((o) => o.lettre).filter((l) => sel.has(l) && !bonnes.has(l))
  return { justes, oublies, aTort, correct: oublies.length === 0 && aTort.length === 0 }
}

export type Statut = 'reussie' | 'ratee' | 'attente'

export interface Resultat {
  statut: Statut
  obtenus: number
  max: number
}

export function resultat(q: Question, a: Answer | undefined): Resultat {
  if (q.type === 'qcm') {
    const ok = qcmDetail(q, a?.selection).correct
    return { statut: ok ? 'reussie' : 'ratee', obtenus: ok ? q.points : 0, max: q.points }
  }
  const note = a?.note
  if (note === undefined || note === null || Number.isNaN(note)) return { statut: 'attente', obtenus: 0, max: q.points }
  // une question ouverte notée sous la moitié du barème est ratée
  return { statut: note < q.points / 2 ? 'ratee' : 'reussie', obtenus: note, max: q.points }
}

/** Arrondit une note saisie au demi-point, bornée au barème. */
export function normaliserNote(v: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round(v * 2) / 2))
}

/* ------------------------------------------------------------------ */
/* Score                                                               */
/* ------------------------------------------------------------------ */

export interface Score {
  obtenus: number
  max: number
  sur20: number
  pct: number
  enAttente: number
  provisoire: boolean
}

function score(obtenus: number, max: number, enAttente: number): Score {
  return {
    obtenus,
    max,
    sur20: max ? (obtenus / max) * 20 : 0,
    pct: max ? (obtenus / max) * 100 : 0,
    enAttente,
    provisoire: enAttente > 0,
  }
}

export interface ScoreSession {
  global: Score
  parEpreuve: Partial<Record<Epreuve, Score>>
}

export function scoreSession(s: Session, qmap: Record<string, Question>): ScoreSession {
  const acc: Partial<Record<Epreuve, { o: number; m: number; a: number }>> = {}
  let o = 0
  let m = 0
  let att = 0
  for (const id of s.questionIds) {
    const q = qmap[id]
    if (!q) continue
    const r = resultat(q, s.answers[id])
    const e = (acc[q.epreuve] ??= { o: 0, m: 0, a: 0 })
    e.o += r.obtenus
    e.m += r.max
    o += r.obtenus
    m += r.max
    if (r.statut === 'attente') {
      e.a++
      att++
    }
  }
  const parEpreuve: Partial<Record<Epreuve, Score>> = {}
  for (const [k, v] of Object.entries(acc)) parEpreuve[k as Epreuve] = score(v.o, v.m, v.a)
  return { global: score(o, m, att), parEpreuve }
}

export function rateesIds(s: Session, qmap: Record<string, Question>): string[] {
  return s.questionIds.filter((id) => qmap[id] && resultat(qmap[id], s.answers[id]).statut === 'ratee')
}

export function ouvertesIds(s: Session, qmap: Record<string, Question>): string[] {
  return s.questionIds.filter((id) => qmap[id]?.type === 'ouverte')
}

/* ------------------------------------------------------------------ */
/* Export « Copier pour correction »                                   */
/* ------------------------------------------------------------------ */

export const ENTETE_CORRECTION =
  'Corrige ces réponses selon le corrigé officiel CMA, donne une note par question sur son barème.'

export const fmtPts = (p: number) => `${String(p).replace('.', ',')} point${p > 1 ? 's' : ''}`

export function texteCorrection(s: Session, qmap: Record<string, Question>): string {
  const blocs = ouvertesIds(s, qmap).map((id) => {
    const q = qmap[id]
    const rep = (s.answers[id]?.texte ?? '').trim() || '(pas de réponse)'
    return `[${q.annee} – ${q.epreuve} – Q${q.numero}] (${fmtPts(q.points)})\nÉnoncé : ${q.enonce}\nMa réponse : ${rep}`
  })
  return [ENTETE_CORRECTION, ...blocs].join('\n\n')
}

/* ------------------------------------------------------------------ */
/* Statistiques (recalculées à partir de l'historique)                 */
/* ------------------------------------------------------------------ */

export interface StatQuestion {
  tentatives: number
  reussites: number
  /** réussites consécutives depuis la dernière erreur */
  serie: number
  enErreur: boolean
  /** apparue dans au moins une session terminée (même si la note est en attente) */
  vue: boolean
}

/** Une question ratée reste dans « Mes erreurs » jusqu'à 2 réussites consécutives. */
export const REUSSITES_POUR_SORTIR = 2

export function calculerStats(store: Store, qmap: Record<string, Question>): Record<string, StatQuestion> {
  const stats: Record<string, StatQuestion> = {}
  const sessions = store.sessions.filter((s) => s.terminee).sort((a, b) => a.date.localeCompare(b.date))
  for (const s of sessions) {
    for (const id of s.questionIds) {
      const q = qmap[id]
      if (!q) continue
      const st = (stats[id] ??= { tentatives: 0, reussites: 0, serie: 0, enErreur: false, vue: false })
      st.vue = true
      const r = resultat(q, s.answers[id])
      if (r.statut === 'attente') continue
      st.tentatives++
      if (r.statut === 'reussie') {
        st.reussites++
        st.serie++
        if (st.enErreur && st.serie >= REUSSITES_POUR_SORTIR) st.enErreur = false
      } else {
        st.serie = 0
        // règle obsolète : l'erreur n'est pas grave, elle ne part pas dans « Mes erreurs »
        if (!q.obsolete) st.enErreur = true
      }
    }
  }
  return stats
}

export interface Taux {
  obtenus: number
  max: number
  pct: number | null
}

export interface StatsGlobales {
  parEpreuve: Record<string, Taux>
  parAnnee: Record<string, Taux>
  global: Taux
  jamaisVues: number
  erreurs: string[]
  plusFaible: Epreuve | null
}

/** Taux de réussite en points (barème réel) sur toutes les tentatives notées. */
export function statsGlobales(store: Store, questions: Question[], qmap: Record<string, Question>): StatsGlobales {
  const parEpreuve: Record<string, Taux> = {}
  const parAnnee: Record<string, Taux> = {}
  const global: Taux = { obtenus: 0, max: 0, pct: null }
  const add = (t: Taux, o: number, m: number) => {
    t.obtenus += o
    t.max += m
  }
  for (const s of store.sessions) {
    if (!s.terminee) continue
    for (const id of s.questionIds) {
      const q = qmap[id]
      if (!q) continue
      const r = resultat(q, s.answers[id])
      if (r.statut === 'attente') continue
      add((parEpreuve[q.epreuve] ??= { obtenus: 0, max: 0, pct: null }), r.obtenus, r.max)
      add((parAnnee[q.annee] ??= { obtenus: 0, max: 0, pct: null }), r.obtenus, r.max)
      add(global, r.obtenus, r.max)
    }
  }
  for (const t of [...Object.values(parEpreuve), ...Object.values(parAnnee), global]) t.pct = t.max ? (100 * t.obtenus) / t.max : null
  const qs = calculerStats(store, qmap)
  const jamaisVues = questions.filter((q) => !qs[q.id]?.vue).length
  const erreurs = questions.filter((q) => qs[q.id]?.enErreur).map((q) => q.id)
  let plusFaible: Epreuve | null = null
  for (const [e, t] of Object.entries(parEpreuve)) {
    if (t.pct === null) continue
    if (plusFaible === null || t.pct < (parEpreuve[plusFaible].pct ?? 101)) plusFaible = e as Epreuve
  }
  return { parEpreuve, parAnnee, global, jamaisVues, erreurs, plusFaible }
}

/* ------------------------------------------------------------------ */
/* Construction des sessions                                           */
/* ------------------------------------------------------------------ */

export function melanger<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ORDRE: Epreuve[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export function trierExamen(qs: Question[]): Question[] {
  return [...qs].sort((a, b) => ORDRE.indexOf(a.epreuve) - ORDRE.indexOf(b.epreuve) || a.numero - b.numero)
}

export function nouvelleSession(mode: Mode, titre: string, ids: string[], extra: Partial<Session> = {}): Session {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    mode,
    titre,
    questionIds: ids,
    answers: {},
    index: 0,
    terminee: false,
    feedbackImmediat: mode !== 'examen',
    ...extra,
  }
}

/**
 * Clôture une session. Hors examen blanc, les questions jamais affichées
 * (session arrêtée avant la fin) sont retirées : elles ne comptent pas.
 */
export function terminerSession(s: Session): Session {
  const ids = s.mode === 'examen' ? s.questionIds : s.questionIds.filter((id) => id in s.answers)
  return { ...s, questionIds: ids, terminee: true, dateFin: new Date().toISOString() }
}

export const NOM_MODE: Record<Mode, string> = {
  examen: 'Examen blanc',
  entrainement: 'Entraînement',
  aleatoire: 'Mélange aléatoire',
  erreurs: 'Mes erreurs',
  ouvertes: 'Questions ouvertes',
  refaire: 'Refaire les ratées',
}

export const fmtNombre = (n: number, d = 1) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d })
