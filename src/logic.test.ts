import { describe, expect, it } from 'vitest'
import { QMAP, QUESTIONS } from './data'
import {
  calculerStats,
  ENTETE_CORRECTION,
  normaliserNote,
  nouvelleSession,
  qcmDetail,
  rateesIds,
  scoreSession,
  statsGlobales,
  terminerSession,
  texteCorrection,
} from './logic'
import type { Session, Store } from './types'

const multi = QMAP['2022-A-03'] // bonnes : B et D
const ouverte = QMAP['2022-G-08'] // 4 points

const store = (...sessions: Session[]): Store => ({ version: 1, sessions, prefs: {} })
const fin = (s: Session, date: string) => ({ ...terminerSession(s), date })

describe('données', () => {
  it('contient les 428 questions VTC', () => {
    expect(QUESTIONS).toHaveLength(428)
    expect(multi.bonnes).toEqual(['B', 'D'])
    expect(ouverte.type).toBe('ouverte')
    expect(ouverte.points).toBe(4)
  })
})

describe('QCM à réponses multiples', () => {
  it('juste seulement si exactement toutes les bonnes cases', () => {
    expect(qcmDetail(multi, ['B', 'D']).correct).toBe(true)
    expect(qcmDetail(multi, ['D', 'B']).correct).toBe(true)
  })
  it('une bonne réponse oubliée rend la question fausse', () => {
    const d = qcmDetail(multi, ['B'])
    expect(d.correct).toBe(false)
    expect(d.oublies).toEqual(['D'])
    expect(d.aTort).toEqual([])
  })
  it('une case de trop rend la question fausse', () => {
    const d = qcmDetail(multi, ['A', 'B', 'D'])
    expect(d.correct).toBe(false)
    expect(d.aTort).toEqual(['A'])
    expect(d.justes).toEqual(['B', 'D'])
  })
  it('aucune case cochée = faux, tout est oublié', () => {
    expect(qcmDetail(multi, []).oublies).toEqual(['B', 'D'])
  })
})

describe('score de session (barème réel)', () => {
  it('compte les points, provisoire tant qu’une ouverte n’est pas notée', () => {
    const s0 = nouvelleSession('aleatoire', 't', [multi.id, 'meta', ouverte.id].filter((id) => QMAP[id]))
    const s = terminerSession({ ...s0, answers: { [multi.id]: { selection: ['B', 'D'] }, [ouverte.id]: { texte: 'x' } } })
    let sc = scoreSession(s, QMAP)
    expect(sc.global.obtenus).toBe(1)
    expect(sc.global.max).toBe(5)
    expect(sc.global.provisoire).toBe(true)
    expect(sc.global.sur20).toBe(4)

    const notee = { ...s, answers: { ...s.answers, [ouverte.id]: { texte: 'x', note: 2.5 } } }
    sc = scoreSession(notee, QMAP)
    expect(sc.global.provisoire).toBe(false)
    expect(sc.global.obtenus).toBe(3.5)
    expect(sc.global.pct).toBeCloseTo(70)
    expect(sc.parEpreuve.A!.sur20).toBe(20)
    expect(sc.parEpreuve.G!.sur20).toBeCloseTo(12.5)
  })
  it('une ouverte sous la moitié du barème est ratée', () => {
    const s = terminerSession({ ...nouvelleSession('ouvertes', 't', [ouverte.id]), answers: { [ouverte.id]: { note: 1.5 } } })
    expect(rateesIds(s, QMAP)).toEqual([ouverte.id])
    const s2 = { ...s, answers: { [ouverte.id]: { note: 2 } } }
    expect(rateesIds(s2, QMAP)).toEqual([])
  })
  it('arrondit les notes au demi-point dans le barème', () => {
    expect(normaliserNote(1.3, 4)).toBe(1.5)
    expect(normaliserNote(9, 4)).toBe(4)
    expect(normaliserNote(-1, 4)).toBe(0)
  })
  it('hors examen, les questions jamais affichées sont retirées à la fin', () => {
    const s = nouvelleSession('aleatoire', 't', [multi.id, ouverte.id])
    expect(terminerSession({ ...s, answers: { [multi.id]: {} } }).questionIds).toEqual([multi.id])
    const e = nouvelleSession('examen', 't', [multi.id, ouverte.id])
    expect(terminerSession(e).questionIds).toHaveLength(2)
  })
})

describe('« Copier pour correction »', () => {
  it('produit le format demandé', () => {
    const s = { ...nouvelleSession('aleatoire', 't', [multi.id, ouverte.id]), answers: { [ouverte.id]: { texte: '  Ma réponse  ' } } }
    const t = texteCorrection(s, QMAP)
    expect(t.startsWith(ENTETE_CORRECTION + '\n\n')).toBe(true)
    expect(t).toContain(`[2022 – G – Q8] (4 points)\nÉnoncé : ${ouverte.enonce}\nMa réponse : Ma réponse`)
    expect(t).not.toContain(multi.enonce)
  })
})

describe('Mes erreurs', () => {
  const sess = (sel: string[], date: string) =>
    fin({ ...nouvelleSession('aleatoire', 't', [multi.id]), answers: { [multi.id]: { selection: sel } } }, date)

  it('une question ratée revient jusqu’à 2 réussites de suite', () => {
    const ko = sess(['B'], '2026-01-01')
    expect(calculerStats(store(ko), QMAP)[multi.id].enErreur).toBe(true)
    const ok1 = sess(['B', 'D'], '2026-01-02')
    expect(calculerStats(store(ko, ok1), QMAP)[multi.id].enErreur).toBe(true)
    const ko2 = sess([], '2026-01-03')
    const ok2 = sess(['B', 'D'], '2026-01-04')
    // ok, ko, ok : la série repart de zéro
    expect(calculerStats(store(ko, ok1, ko2, ok2), QMAP)[multi.id].enErreur).toBe(true)
    const ok3 = sess(['B', 'D'], '2026-01-05')
    expect(calculerStats(store(ko, ok1, ko2, ok2, ok3), QMAP)[multi.id].enErreur).toBe(false)
  })
  it('une ouverte notée sous la moitié part dans les erreurs, seulement une fois notée', () => {
    const s = fin({ ...nouvelleSession('ouvertes', 't', [ouverte.id]), answers: { [ouverte.id]: { texte: 'x' } } }, '2026-01-01')
    expect(calculerStats(store(s), QMAP)[ouverte.id].enErreur).toBe(false)
    const n = { ...s, answers: { [ouverte.id]: { texte: 'x', note: 1 } } }
    expect(calculerStats(store(n), QMAP)[ouverte.id].enErreur).toBe(true)
  })
  it('2019-C-19 (règle obsolète) ne part pas dans les erreurs', () => {
    const q = QMAP['2019-C-19']
    expect(q.obsolete).toBe(true)
    const s = fin({ ...nouvelleSession('aleatoire', 't', [q.id]), answers: { [q.id]: { selection: ['B'] } } }, '2026-01-01')
    expect(rateesIds(s, QMAP)).toEqual([q.id])
    expect(calculerStats(store(s), QMAP)[q.id].enErreur).toBe(false)
  })
})

describe('statistiques globales', () => {
  it('taux par épreuve, par année, jamais vues et épreuve la plus faible', () => {
    const s = fin(
      {
        ...nouvelleSession('aleatoire', 't', [multi.id, ouverte.id]),
        answers: { [multi.id]: { selection: ['B', 'D'] }, [ouverte.id]: { note: 1 } },
      },
      '2026-01-01',
    )
    const st = statsGlobales(store(s), QUESTIONS, QMAP)
    expect(st.parEpreuve.A.pct).toBe(100)
    expect(st.parEpreuve.G.pct).toBe(25)
    expect(st.parAnnee['2022'].pct).toBe(40)
    expect(st.jamaisVues).toBe(426)
    expect(st.plusFaible).toBe('G')
    expect(st.erreurs).toEqual([ouverte.id])
  })
})
