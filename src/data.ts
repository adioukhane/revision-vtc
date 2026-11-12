import questionsJson from '../data/questions.json'
import textesJson from '../data/textes.json'
import type { Epreuve, Question, Texte } from './types'

export const QUESTIONS = questionsJson as Question[]
export const TEXTES = textesJson as Texte[]
export const QMAP: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]))
export const TMAP: Record<string, Texte> = Object.fromEntries(TEXTES.map((t) => [t.id, t]))

export const EPREUVES: Epreuve[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
export const ANNEES = [...new Set(QUESTIONS.map((q) => q.annee))].sort()

export const NOM_EPREUVE: Record<Epreuve, string> = {
  A: 'Réglementation T3P',
  B: 'Gestion',
  C: 'Sécurité routière',
  D: 'Français',
  E: 'Anglais',
  F: 'Développement commercial VTC',
  G: 'Réglementation nationale VTC',
}

/** Durées indicatives (minutes), modifiables dans l'écran de l'examen blanc. */
export const DUREES_DEFAUT: Record<Epreuve, number> = { A: 45, B: 45, C: 30, D: 30, E: 30, F: 30, G: 20 }

/** Chemin public d'une image (fonctionne quelle que soit l'URL de déploiement). */
export const asset = (p: string) => import.meta.env.BASE_URL + p
