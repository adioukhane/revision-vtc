# Rapport de contrôle de l'extraction des annales VTC

## Sources

- `Annales 2019.pdf`, `Annales 2020.pdf`, `Annales 2021.pdf`, `Annales 2022.pdf` (Evalbox, CMA France).
- `Annales 2021 (1).pdf` et `Annales 2022 (1).pdf` sont des copies identiques (même empreinte MD5) : ignorées.
- Les PDF sont à la racine du dossier (il n'y a pas de sous-dossier `annales/`).
- Épreuves exclues (taxi et VMDTR) : FM = 64 questions, GM = 32 questions, GT = 62 questions.

## Méthode de lecture des bonnes réponses

Dans les PDF Evalbox, chaque option de QCM est précédée d'une petite image : un rond vide ou une pastille jaune (« à cocher »). La bonne réponse a été déterminée de trois façons indépendantes :

1. **Image source** : chaque image placée devant une option est classée « jaune » ou « vide » d'après ses pixels.
2. **Rendu de page** : chaque page est rendue en image (×3) et on mesure la couleur à l'emplacement exact de la case.
3. **Relecture visuelle** : les 66 pages VTC ont été rendues avec un cadre rouge sur les cases détectées comme bonnes (et bleu sur les autres), puis relues à l'œil une par une pour vérifier que chaque pastille jaune a un cadre rouge et inversement.

Résultat : **1235 cases d'options** analysées, **0 désaccord** entre les méthodes 1 et 2, et aucune anomalie à la relecture visuelle.

## Nombre de questions par année et par épreuve

| Épreuve | 2019 | 2020 | 2021 | 2022 | Total |
|---|---|---|---|---|---|
| A – Réglementation T3P | 15 (10 QCM, 5 ouv.) – 20 pts | 15 (10 QCM, 5 ouv.) – 20 pts | 15 (10 QCM, 5 ouv.) – 20 pts | 15 (10 QCM, 5 ouv.) – 20 pts | 60 |
| B – Gestion | 18 (16 QCM, 2 ouv.) – 20 pts | 18 (16 QCM, 2 ouv.) – 20 pts | 18 (16 QCM, 2 ouv.) – 20 pts | 18 (16 QCM, 2 ouv.) – 20 pts | 72 |
| C – Sécurité routière | 20 (20 QCM, 0 ouv.) – 26 pts | 20 (20 QCM, 0 ouv.) – 20 pts | 20 (20 QCM, 0 ouv.) – 20 pts | 20 (20 QCM, 0 ouv.) – 20 pts | 80 |
| D – Français | 10 (7 QCM, 3 ouv.) – 20 pts | 10 (7 QCM, 3 ouv.) – 20 pts | 10 (7 QCM, 3 ouv.) – 20 pts | 10 (7 QCM, 3 ouv.) – 20 pts | 40 |
| E – Anglais | 20 (20 QCM, 0 ouv.) – 20 pts | 20 (20 QCM, 0 ouv.) – 20 pts | 20 (20 QCM, 0 ouv.) – 20 pts | 20 (20 QCM, 0 ouv.) – 20 pts | 80 |
| F – Développement commercial VTC | 16 (13 QCM, 3 ouv.) – 19 pts | 16 (12 QCM, 4 ouv.) – 20 pts | 16 (12 QCM, 4 ouv.) – 20 pts | 16 (12 QCM, 4 ouv.) – 20 pts | 64 |
| G – Réglementation nationale VTC | 8 (6 QCM, 2 ouv.) – 20 pts | 8 (6 QCM, 2 ouv.) – 20 pts | 8 (6 QCM, 2 ouv.) – 20 pts | 8 (6 QCM, 2 ouv.) – 20 pts | 32 |
| **Total** | **107** | **107** | **107** | **107** | **428** |

Total : **428 questions** dont **365 QCM** (81 à plusieurs bonnes réponses, soit 22 %) et **63 questions ouvertes**.

Barème : relevé question par question (« 0 point / N »). La plupart des QCM valent 1 point (2 en D et G, 3 pour quelques questions de C en 2019), les questions ouvertes 2 ou 4 points. Deux totaux ne font pas 20, et c'est bien le barème du PDF : **2019 C = 26 pts** (Q1, Q4 et Q11 valent 3 points) et **2019 F = 19 pts**. L'appli ramènera chaque score sur 20.

## QCM sans bonne réponse détectée

Aucun.

## Questions à relire (doutes et cas particuliers)

Aucun doute sur la lecture des pastilles elles-mêmes : elles sont nettes et les trois méthodes concordent. Les cas ci-dessous demandent une relecture pour d'autres raisons.

### Corrigés officiels surprenants (lecture sûre, contenu discutable)

- **2019-C-19** (circulation dans Paris, véhicules immatriculés avant le 1er janvier…) : trois années sont cochées (1997, 1995, 1996). C'est bien ce qu'indique le PDF. Je l'ai gardé tel quel, avec une note (règle obsolète depuis Crit'Air). Elle est marquée `obsolete: true` : une erreur dessus n'est pas ajoutée à « Mes erreurs ».
- **2020-A-14 / 2021-A-13** (conducteur né le 12 mai 1950 → visite tous les 2 ans) : la réponse dépend de l'âge à la date de l'examen. Note ajoutée dans l'appli.

### Mise en page particulière

- **2019-C-17** : la case du numéro est absente du PDF (la question commence par une image en haut de page). Numéro 17 déduit de la séquence ; énoncé « Cet emplacement : » + image de place handicapé. Réponses B et C.
- **14 questions coupées par un saut de page** : la lettre d'option est en bas de page et la case en haut de la page suivante. Rattachement vérifié visuellement : 2019-B-09, 2019-C-07, 2019-F-09, 2020-C-09, 2020-C-20, 2020-E-20, 2021-B-09, 2021-C-08, 2021-C-18, 2021-E-10, 2021-E-20, 2022-C-09, 2022-D-06, 2022-E-10.
- **2021-A-07** : le corrigé officiel répète l'énoncé (« Comment se présente une réservation préalable ?… »). Je l'ai gardé tel quel.

### Images et textes supports

- 2019-C-01 : `public/img/2019-C-01.png` – Ce panneau :
- 2019-C-17 : `public/img/2019-C-17.png` – Cet emplacement :
- 2020-C-17 : `public/img/2020-C-17.png` – Ce panneau signale :
- 2021-C-20 : `public/img/2021-C-20.png` – Ce panneau signale :
- 2022-C-17 : `public/img/2022-C-17.png` – Ce pictogramme, qui figure sur des boîtes de médicaments, signifie :

- Texte support **D-2019** : l'article est une **image** dans le PDF (pas de texte extractible). Je l'ai découpé dans `public/img/texte-2019.jpg` et lié à 10 questions. L'appli l'affiche en image zoomable.
- Texte support **D-2020** : l'article est une **image** dans le PDF (pas de texte extractible). Je l'ai découpé dans `public/img/texte-2020.jpg` et lié à 10 questions. L'appli l'affiche en image zoomable.
- Texte support **D-2021** : l'article est une **image** dans le PDF (pas de texte extractible). Je l'ai découpé dans `public/img/texte-2021.jpg` et lié à 10 questions. L'appli l'affiche en image zoomable.
- Texte support **D-2022** (« Quelle place pour le vélo en France ? ») : texte extrait du PDF, lié à 10 questions.
- 2020 et 2021 utilisent le même article (Cybertruck de Tesla), avec des questions en partie identiques.

## Contradictions entre années

Méthode : comparaison automatique de toutes les paires de questions d'années différentes à énoncé quasi identique (145 paires), puis relecture des 20 paires dont la réponse diffère. La plupart ne diffèrent que par la formulation, les options proposées ou l'ordre des lettres. Contradictions réelles :

| Sujet | Année A | Année B | Champ « note » rempli |
|---|---|---|---|
| Usage privé du véhicule VTC | 2020-G-08 : « retirer ou occulter la signalétique VTC » | 2021-G-06 : « retirer la carte professionnelle » | oui (les deux) |
| Véhicule électrique hors normes techniques | 2020-G-02 : « demande de dérogation au préfet » | 2021-G-04 : « aucune démarche » (comme 2019-G-04) | oui (les trois) |
| Excès de vitesse de 40 km/h | 2019-C-08 : suspension seule | 2022-C-20 : suspension **+ retrait de 4 points** | oui (les deux) |

Pas des contradictions, mais à connaître :
- **Ancienneté du véhicule** : 2019-G-03 (« 6 ans » pour un véhicule VTC) et 2020-A-10 / 2021-A-06 (« aucune » pour un hybride) sont cohérents : les hybrides et électriques sont dispensés.
- **Gérant salarié** : 2020-B-12 (gérant minoritaire de SARL à 49 % + gérant/président de SAS) et 2021-B-14 (président de SAS) sont cohérents, seules les options changent.
- **La même question avec des lettres différentes** (ex. « code des transports » = D en 2019, C en 2020) : c'est normal, les options sont mélangées d'une année à l'autre.

## Questions qui reviennent d'une année sur l'autre

241 questions sur 428 ont au moins un quasi-doublon dans une autre année. Le mode « Questions ouvertes uniquement » et le mode « Mes erreurs » permettent de les travailler en priorité.

## Fichiers produits

- `data/questions.json` : les questions (schéma demandé, avec le champ `texteSupportId` pour l'épreuve D).
- `data/textes.json` : les textes supports de l'épreuve D (`id`, `annee`, `titre`, `texte` ou `image`).
- `public/img/` : images des questions de sécurité routière et des articles de l'épreuve D.
- `scripts/extract.py`, `scripts/build.py`, `scripts/rapport.py` : la chaîne d'extraction, reproductible. `scripts/notes.json` contient les notes affichées dans l'appli.
