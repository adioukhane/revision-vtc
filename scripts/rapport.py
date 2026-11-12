"""Génère data/rapport.md à partir de data/questions.json et des métadonnées d'extraction.

Usage : python -I scripts/rapport.py <raw_dir> <racine_projet>
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

RAW, ROOT = Path(sys.argv[1]), Path(sys.argv[2])
EP = {"A": "Réglementation T3P", "B": "Gestion", "C": "Sécurité routière", "D": "Français",
      "E": "Anglais", "F": "Développement commercial VTC", "G": "Réglementation nationale VTC"}
YEARS = [2019, 2020, 2021, 2022]

qs = json.loads((ROOT / "data" / "questions.json").read_text())
meta = {q["id"]: q["_meta"] for q in json.loads((RAW / "questions_meta.json").read_text())}
textes = json.loads((ROOT / "data" / "textes.json").read_text())
pairs = json.loads((RAW / "pairs.json").read_text())
raw = json.loads((RAW / "raw_questions.json").read_text())

L = []
w = L.append
w("# Rapport de contrôle de l'extraction des annales VTC\n")
w("## Sources\n")
w("- `Annales 2019.pdf`, `Annales 2020.pdf`, `Annales 2021.pdf`, `Annales 2022.pdf` (Evalbox, CMA France).")
w("- `Annales 2021 (1).pdf` et `Annales 2022 (1).pdf` sont des copies identiques (même empreinte MD5) : ignorées.")
w("- Les PDF sont à la racine du dossier (il n'y a pas de sous-dossier `annales/`).")
excl = defaultdict(int)
for r in raw:
    if r["epreuve_raw"] in ("FT", "GT", "FM", "GM"):
        excl[r["epreuve_raw"]] += 1
w(f"- Épreuves exclues (taxi et VMDTR) : " + ", ".join(f"{k} = {v} questions" for k, v in sorted(excl.items())) + ".\n")

w("## Méthode de lecture des bonnes réponses\n")
w("Dans les PDF Evalbox, chaque option de QCM est précédée d'une petite image : un rond vide ou une pastille jaune "
  "(« à cocher »). La bonne réponse a été déterminée de trois façons indépendantes :\n")
w("1. **Image source** : chaque image placée devant une option est classée « jaune » ou « vide » d'après ses pixels.")
w("2. **Rendu de page** : chaque page est rendue en image (×3) et on mesure la couleur à l'emplacement exact de la case.")
w("3. **Relecture visuelle** : les 66 pages VTC ont été rendues avec un cadre rouge sur les cases détectées comme "
  "bonnes (et bleu sur les autres), puis relues à l'œil une par une pour vérifier que chaque pastille jaune a un cadre "
  "rouge et inversement.\n")
n_opts = sum(len(m["methodes"]) for m in meta.values())
disagree = [qid for qid, m in meta.items() for l, d in m["methodes"] if d and d[0] != d[1]]
w(f"Résultat : **{n_opts} cases d'options** analysées, **{len(disagree)} désaccord** entre les méthodes 1 et 2, "
  "et aucune anomalie à la relecture visuelle.\n")

# ---- Comptage ----
w("## Nombre de questions par année et par épreuve\n")
w("| Épreuve | " + " | ".join(str(y) for y in YEARS) + " | Total |")
w("|---|" + "---|" * (len(YEARS) + 1))
tot_y = defaultdict(int)
for e in "ABCDEFG":
    row = []
    s = 0
    for y in YEARS:
        sub = [q for q in qs if q["annee"] == y and q["epreuve"] == e]
        nq = sum(q["type"] == "qcm" for q in sub)
        no = len(sub) - nq
        pts = sum(q["points"] for q in sub)
        row.append(f"{len(sub)} ({nq} QCM, {no} ouv.) – {pts:g} pts")
        s += len(sub)
        tot_y[y] += len(sub)
    w(f"| {e} – {EP[e]} | " + " | ".join(row) + f" | {s} |")
w("| **Total** | " + " | ".join(f"**{tot_y[y]}**" for y in YEARS) + f" | **{len(qs)}** |\n")
nq = sum(q["type"] == "qcm" for q in qs)
nmulti = sum(q["type"] == "qcm" and len(q["bonnes"]) > 1 for q in qs)
w(f"Total : **{len(qs)} questions** dont **{nq} QCM** ({nmulti} à plusieurs bonnes réponses, soit "
  f"{100 * nmulti / nq:.0f} %) et **{len(qs) - nq} questions ouvertes**.\n")
w("Barème : relevé question par question (« 0 point / N »). La plupart des QCM valent 1 point (2 en D et G, "
  "3 pour quelques questions de C en 2019), les questions ouvertes 2 ou 4 points. Deux totaux ne font pas 20, "
  "et c'est bien le barème du PDF : **2019 C = 26 pts** (Q1, Q4 et Q11 valent 3 points) et **2019 F = 19 pts**. "
  "L'appli ramènera chaque score sur 20.\n")

# ---- QCM sans bonne réponse ----
w("## QCM sans bonne réponse détectée\n")
none = [q["id"] for q in qs if q["type"] == "qcm" and not q["bonnes"]]
w("Aucun." if not none else "\n".join(f"- {i}" for i in none))
w("")
allb = [q["id"] for q in qs if q["type"] == "qcm" and len(q["bonnes"]) == len(q["options"])]
if allb:
    w("QCM où **toutes** les options sont cochées : " + ", ".join(allb) + "\n")

# ---- Doutes ----
w("## Questions à relire (doutes et cas particuliers)\n")
w("Aucun doute sur la lecture des pastilles elles-mêmes : elles sont nettes et les trois méthodes concordent. "
  "Les cas ci-dessous demandent une relecture pour d'autres raisons.\n")
w("### Corrigés officiels surprenants (lecture sûre, contenu discutable)\n")
w("- **2019-C-19** (circulation dans Paris, véhicules immatriculés avant le 1er janvier…) : trois années sont "
  "cochées (1997, 1995, 1996). C'est bien ce qu'indique le PDF. Je l'ai gardé tel quel, avec une note (règle obsolète depuis Crit'Air). Elle est marquée `obsolete: true` : une erreur dessus n'est pas ajoutée à « Mes erreurs ».")
w("- **2020-A-14 / 2021-A-13** (conducteur né le 12 mai 1950 → visite tous les 2 ans) : la réponse dépend de l'âge "
  "à la date de l'examen. Note ajoutée dans l'appli.\n")
w("### Mise en page particulière\n")
w("- **2019-C-17** : la case du numéro est absente du PDF (la question commence par une image en haut de page). "
  "Numéro 17 déduit de la séquence ; énoncé « Cet emplacement : » + image de place handicapé. Réponses B et C.")
sp = [qid for qid, m in meta.items() if m["saut_page"]]
w(f"- **{len(sp)} questions coupées par un saut de page** : la lettre d'option est en bas de page et la case en haut "
  "de la page suivante. Rattachement vérifié visuellement : " + ", ".join(sorted(sp)) + ".")
w("- **2021-A-07** : le corrigé officiel répète l'énoncé (« Comment se présente une réservation préalable ?… »). "
  "Je l'ai gardé tel quel.\n")

w("### Images et textes supports\n")
for q in qs:
    if q.get("image"):
        w(f"- {q['id']} : `public/{q['image']}` – {q['enonce']}")
w("")
for t in textes:
    nb = sum(q.get("texteSupportId") == t["id"] for q in qs)
    if t.get("texte"):
        w(f"- Texte support **{t['id']}** (« {t['titre']} ») : texte extrait du PDF, lié à {nb} questions.")
    else:
        w(f"- Texte support **{t['id']}** : l'article est une **image** dans le PDF (pas de texte extractible). "
          f"Je l'ai découpé dans `public/{t['image']}` et lié à {nb} questions. L'appli l'affiche en image zoomable.")
w("- 2020 et 2021 utilisent le même article (Cybertruck de Tesla), avec des questions en partie identiques.\n")

# ---- Contradictions ----
w("## Contradictions entre années\n")
w("Méthode : comparaison automatique de toutes les paires de questions d'années différentes à énoncé quasi identique "
  f"({len(pairs)} paires), puis relecture des {sum(p['differ'] for p in pairs)} paires dont la réponse diffère. "
  "La plupart ne diffèrent que par la formulation, les options proposées ou l'ordre des lettres. Contradictions réelles :\n")
w("| Sujet | Année A | Année B | Champ « note » rempli |")
w("|---|---|---|---|")
w("| Usage privé du véhicule VTC | 2020-G-08 : « retirer ou occulter la signalétique VTC » | 2021-G-06 : « retirer la carte professionnelle » | oui (les deux) |")
w("| Véhicule électrique hors normes techniques | 2020-G-02 : « demande de dérogation au préfet » | 2021-G-04 : « aucune démarche » (comme 2019-G-04) | oui (les trois) |")
w("| Excès de vitesse de 40 km/h | 2019-C-08 : suspension seule | 2022-C-20 : suspension **+ retrait de 4 points** | oui (les deux) |")
w("")
w("Pas des contradictions, mais à connaître :")
w("- **Ancienneté du véhicule** : 2019-G-03 (« 6 ans » pour un véhicule VTC) et 2020-A-10 / 2021-A-06 (« aucune » pour un hybride) sont cohérents : les hybrides et électriques sont dispensés.")
w("- **Gérant salarié** : 2020-B-12 (gérant minoritaire de SARL à 49 % + gérant/président de SAS) et 2021-B-14 (président de SAS) sont cohérents, seules les options changent.")
w("- **La même question avec des lettres différentes** (ex. « code des transports » = D en 2019, C en 2020) : c'est normal, les options sont mélangées d'une année à l'autre.\n")

w("## Questions qui reviennent d'une année sur l'autre\n")
same = [p for p in pairs if p["sim"] >= 0.95]
ids = sorted({p["a"] for p in same} | {p["b"] for p in same})
w(f"{len(ids)} questions sur {len(qs)} ont au moins un quasi-doublon dans une autre année. Le mode « Questions "
  "ouvertes uniquement » et le mode « Mes erreurs » permettent de les travailler en priorité.\n")

w("## Fichiers produits\n")
w("- `data/questions.json` : les questions (schéma demandé, avec le champ `texteSupportId` pour l'épreuve D).")
w("- `data/textes.json` : les textes supports de l'épreuve D (`id`, `annee`, `titre`, `texte` ou `image`).")
w("- `public/img/` : images des questions de sécurité routière et des articles de l'épreuve D.")
w("- `scripts/extract.py`, `scripts/build.py`, `scripts/rapport.py` : la chaîne d'extraction, reproductible. "
  "`scripts/notes.json` contient les notes affichées dans l'appli.")

(ROOT / "data" / "rapport.md").write_text("\n".join(L) + "\n")
print("rapport écrit")
