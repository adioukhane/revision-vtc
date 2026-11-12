# Révision VTC

Site de révision de l'examen théorique VTC (CMA), construit à partir des annales officielles 2019 à 2022 :
428 questions (365 QCM, 63 questions ouvertes) des épreuves A, B, C, D, E, F(V) et G(V).

Site statique (Vite + React + TypeScript), sans compte ni serveur : la progression est enregistrée dans le
navigateur (localStorage), sur chaque appareil séparément.

**En ligne : https://adioukhane.github.io/revision-vtc/**

## Lancer en local

Il faut Node.js 20 ou plus récent.

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173. Pour y accéder depuis ton téléphone sur le même Wi-Fi : `npm run dev -- --host`, puis
ouvrir l'adresse « Network » affichée.

Autres commandes :

```bash
npm test          # tests de la logique (score, QCM multiples, erreurs, export)
npm run build     # version de production dans dist/
```

## Déploiement

Chaque `git push` sur `main` publie automatiquement le site sur GitHub Pages
(workflow `.github/workflows/deploy.yml`, qui lance aussi les tests).

Le site fonctionne aussi tel quel sur Vercel : importer le dépôt, framework « Vite », aucune configuration à ajouter.

## Modes de révision

- **Mélange aléatoire** : 20, 50 ou 100 questions tirées dans toutes les annales.
- **Examen blanc** : une année complète, épreuve par épreuve, avec un chrono réglable par épreuve. Pas de correction avant la fin.
- **Entraînement** : les épreuves et années de ton choix, questions mélangées.
- **Mes erreurs** : les questions ratées, jusqu'à 2 réussites de suite.
- **Questions ouvertes** : pour apprendre les corrigés par cœur.

Un QCM n'est juste que si toutes les bonnes cases sont cochées, et aucune mauvaise. Le nombre de réponses attendues
n'est jamais indiqué. Les questions ouvertes ne sont pas corrigées automatiquement : à la fin de la session,
« Copier pour correction » copie tes réponses, tu saisis ensuite la note obtenue, et le corrigé officiel s'affiche.

## Données

- `data/questions.json` : les questions. Les bonnes réponses ont été lues sur les pastilles jaunes des PDF.
- `data/textes.json` : textes supports de l'épreuve D.
- `public/img/` : images (panneaux, articles de l'épreuve D).
- `data/rapport.md` : rapport de contrôle de l'extraction (comptages, cas particuliers, contradictions entre années).

Pour régénérer les données à partir des PDF (placés à la racine, non versionnés), il faut Python avec PyMuPDF :

```bash
python -I scripts/extract.py . /tmp/vtc-raw
python -I scripts/build.py . /tmp/vtc-raw .
python -I scripts/rapport.py /tmp/vtc-raw .
```

Les notes affichées dans l'appli (contradictions, règles obsolètes) sont dans `scripts/notes.json`, les corrections
manuelles dans `scripts/overrides.json`.

> Les annales reflètent la réglementation au moment de leur rédaction : complète tes révisions avec des sources à jour.
