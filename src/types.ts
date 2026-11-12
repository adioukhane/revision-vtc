export type Epreuve = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export interface Option {
  lettre: string
  texte: string
}

export interface Question {
  id: string
  annee: number
  epreuve: Epreuve
  numero: number
  type: 'qcm' | 'ouverte'
  points: number
  enonce: string
  image?: string
  texteSupportId?: string
  options: Option[]
  bonnes: string[]
  corrige?: string
  note?: string
  obsolete?: boolean
}

export interface Texte {
  id: string
  annee: number
  titre?: string
  texte: string | null
  image: string | null
}

export type Mode = 'aleatoire' | 'examen' | 'entrainement' | 'erreurs' | 'ouvertes' | 'refaire'

export interface Answer {
  /** lettres cochées (QCM) */
  selection?: string[]
  /** réponse tapée (question ouverte) */
  texte?: string
  /** QCM validé pendant la session (correction immédiate affichée) */
  valide?: boolean
  /** note saisie par l'utilisateur pour une question ouverte */
  note?: number | null
}

export interface ExamConfig {
  annee: number
  epreuves: Epreuve[]
  /** minutes par épreuve */
  durees: Record<Epreuve, number>
  /** index de l'épreuve en cours dans `epreuves` */
  etape: number
  /** horodatage (ms) de fin de l'épreuve en cours, absent tant qu'elle n'a pas commencé */
  finEtape?: number
}

export interface Session {
  id: string
  date: string
  dateFin?: string
  mode: Mode
  titre: string
  questionIds: string[]
  answers: Record<string, Answer>
  index: number
  terminee: boolean
  /** correction affichée après chaque QCM (tous les modes sauf l'examen blanc) */
  feedbackImmediat: boolean
  examen?: ExamConfig
}

export interface Prefs {
  durees?: Partial<Record<Epreuve, number>>
}

export interface Store {
  version: 1
  sessions: Session[]
  courante?: string
  prefs: Prefs
}
