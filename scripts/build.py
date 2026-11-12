"""Construit data/questions.json, data/textes.json et public/img/* à partir de l'extraction brute.

Usage : python -I scripts/build.py <dossier_pdf> <raw_dir> <racine_projet>
"""
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz

PDF_DIR, RAW, ROOT = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
WRAP = "\u23ce"
KEEP = {"A": "A", "B": "B", "C": "C", "D": "D", "E": "E", "FV": "F", "GV": "G"}
NOTES = json.loads((ROOT / "scripts" / "notes.json").read_text()) if (ROOT / "scripts" / "notes.json").exists() else {}
OVERRIDES = json.loads((ROOT / "scripts" / "overrides.json").read_text()) if (ROOT / "scripts" / "overrides.json").exists() else {}


def join_lines(lines):
    """Recolle les lignes coupées par la mise en page (marquées WRAP), garde les vrais retours à la ligne."""
    out, wrapped = "", False
    for l in lines:
        w = l.rstrip().endswith(WRAP)
        l = l.replace(WRAP, "").strip()
        if not l:
            wrapped = False
            continue
        if not out:
            out = l
        else:
            out += (" " if wrapped else "\n") + l
        wrapped = w
    return re.sub(r"[ \t]+", " ", out).strip()


def main():
    raw = json.loads((RAW / "raw_questions.json").read_text())
    bigs = json.loads((RAW / "big_images.json").read_text())
    img_dir = ROOT / "public" / "img"
    img_dir.mkdir(parents=True, exist_ok=True)
    docs = {y: fitz.open(PDF_DIR / f"Annales {y}.pdf") for y in (2019, 2020, 2021, 2022)}

    questions, textes = [], []
    by_key = {}
    for r in raw:
        if r["epreuve_raw"] not in KEEP:
            continue
        ep = KEEP[r["epreuve_raw"]]
        qid = f"{r['annee']}-{ep}-{r['numero']:02d}"
        q = {
            "id": qid,
            "annee": r["annee"],
            "epreuve": ep,
            "numero": r["numero"],
            "type": r["type"],
            "points": r["points"],
            "enonce": join_lines(r["enonce_lines"]),
        }
        if r["type"] == "qcm":
            q["options"] = [{"lettre": o["lettre"], "texte": join_lines(o["lines"])} for o in r["options"]]
            q["bonnes"] = [o["lettre"] for o in r["options"] if o["_dots"] and o["_dots"][0][0]]
        else:
            q["options"] = []
            q["bonnes"] = []
            q["corrige"] = join_lines(r["corrige_lines"])
        q["_meta"] = {"page": r["page"], "saut_page": r.get("_saut_page", False),
                      "numero_deduit": r.get("_numero_deduit", False),
                      "methodes": [[o["lettre"], o["_dots"][0] if o["_dots"] else None] for o in r["options"]]}
        questions.append(q)
        by_key[(r["annee"], r["epreuve_raw"], r["numero"])] = q

    # ---- images : chaque grande image précède la question suivante ----
    for b in bigs:
        y, ep_raw = b["annee"], b["epreuve"]
        if ep_raw not in KEEP:
            continue
        nxt = (b["after_q"] or 0) + 1
        page = docs[y][b["page"] - 1]
        clip = fitz.Rect(*b["bbox"])
        if KEEP[ep_raw] == "D":
            tid = f"D-{y}"
            fname = f"texte-{y}.jpg"
            page.get_pixmap(dpi=220, clip=clip).save(img_dir / fname, jpg_quality=88)
            textes.append({"id": tid, "annee": y, "image": f"img/{fname}", "texte": None})
        else:
            q = by_key[(y, ep_raw, nxt)]
            fname = f"{q['id']}.png"
            page.get_pixmap(dpi=200, clip=clip).save(img_dir / fname)
            q["image"] = f"img/{fname}"

    # ---- texte support 2022 : inclus dans l'énoncé de la Q1 ----
    q1 = by_key[(2022, "D", 1)]
    parts = re.split(r"\s*_{5,}\s*", q1["enonce"])
    if len(parts) == 2:
        head, question = parts
        titre, _, corps = head.partition("\n")
        textes.append({"id": "D-2022", "annee": 2022, "titre": titre.strip(), "texte": corps.strip(), "image": None})
        q1["enonce"] = question.strip()

    for q in questions:
        if q["epreuve"] == "D":
            tid = f"D-{q['annee']}"
            if any(t["id"] == tid for t in textes):
                q["texteSupportId"] = tid

    # ---- corrections manuelles (après relecture visuelle) et notes ----
    for qid, ov in OVERRIDES.items():
        q = next(x for x in questions if x["id"] == qid)
        q.update(ov)
    for q in questions:
        if q["id"] in NOTES:
            q["note"] = NOTES[q["id"]]

    order = ["id", "annee", "epreuve", "numero", "type", "points", "enonce", "image", "texteSupportId",
             "options", "bonnes", "corrige", "note", "obsolete"]
    clean = [{k: q[k] for k in order if k in q} for q in questions]
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "questions.json").write_text(json.dumps(clean, ensure_ascii=False, indent=1))
    (ROOT / "data" / "textes.json").write_text(json.dumps(textes, ensure_ascii=False, indent=1))
    (RAW / "questions_meta.json").write_text(json.dumps(questions, ensure_ascii=False, indent=1))

    # ---- candidats « même question, réponse différente » entre années ----
    def norm(s):
        s = unicodedata.normalize("NFKD", s.lower())
        return re.sub(r"[^a-z0-9 ]", "", "".join(c for c in s if not unicodedata.combining(c)))

    def answer(q):
        if q["type"] == "qcm":
            return sorted(norm(o["texte"]) for o in q["options"] if o["lettre"] in q["bonnes"])
        return [norm(q.get("corrige", ""))]

    pairs = []
    for i, a in enumerate(questions):
        for b in questions[i + 1:]:
            if a["annee"] == b["annee"] or a["type"] != b["type"]:
                continue
            r = difflib.SequenceMatcher(None, norm(a["enonce"]), norm(b["enonce"])).ratio()
            if r < 0.85:
                continue
            aa, ab = answer(a), answer(b)
            if a["type"] == "qcm":
                differ = aa != ab
            else:
                differ = difflib.SequenceMatcher(None, aa[0], ab[0]).ratio() < 0.6
            pairs.append({"a": a["id"], "b": b["id"], "sim": round(r, 2), "differ": differ})
    (RAW / "pairs.json").write_text(json.dumps(pairs, ensure_ascii=False, indent=1))
    print(len(clean), "questions VTC ;", len(textes), "textes ;", sum(p["differ"] for p in pairs), "paires divergentes /", len(pairs))


if __name__ == "__main__":
    main()
