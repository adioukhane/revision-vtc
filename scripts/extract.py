"""Extraction des annales VTC (PDF Evalbox) -> data/raw_questions.json

Usage : python -I scripts/extract.py <dossier_pdf> <dossier_sortie>

Les bonnes réponses des QCM sont des pastilles jaunes (images 16x16) placées
devant les options. On les détecte de deux façons indépendantes :
  1. classification de l'image placée (couleur moyenne de l'image source) ;
  2. couleur des pixels du rendu de la page à l'emplacement de la case.
Les désaccords sont signalés dans le rapport.
"""
import json
import re
import sys
from pathlib import Path

import fitz

PDF_DIR = Path(sys.argv[1])
OUT = Path(sys.argv[2])
YEARS = [2019, 2020, 2021, 2022]

WHITE, GREEN, LETTER = 0xFFFFFF, 0x659C40, 0x999999
WRAP = "\u23ce"


def epreuve_code(title: str):
    t = title.replace('"', " ")
    m = re.search(r"(?:^|[\s-])(F|G)\s*\(?([VTM])\)?(?=[\s-]|$)", t)
    if m:
        return m.group(1) + m.group(2)
    m = re.search(r"(?:^|[\s-])([A-E])\s+-", t)
    if m:
        return m.group(1)
    raise ValueError(title)


def is_yellow_pixmap(pix):
    if pix.colorspace is None or pix.colorspace.n != 3:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    n = pix.n
    s = pix.samples
    yellow = 0
    total = pix.width * pix.height
    for i in range(total):
        r, g, b = s[i * n], s[i * n + 1], s[i * n + 2]
        if r > 200 and g > 150 and b < 120:
            yellow += 1
    return yellow / total


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    all_q = []
    big_images = []
    for year in YEARS:
        doc = fitz.open(PDF_DIR / f"Annales {year}.pdf")
        xref_yellow = {}
        epreuve = None
        cur = None
        questions = []

        def close():
            nonlocal cur
            if cur:
                for dp, dy, dd in cur.pop("_dots_all"):
                    cands = [o for o in cur["options"] if o["_page"] == dp and abs(o["_y"] - dy) < 9]
                    if cands:
                        min(cands, key=lambda o: abs(o["_y"] - dy))["_dots"].append(dd)
                    else:
                        cur.setdefault("_orphan_dots", []).append(dd)
                # saut de page : la lettre est en bas de page, la case en haut de la suivante
                orphans = cur.pop("_orphan_dots", [])
                if orphans:
                    cur["_saut_page"] = True
                    empty = [o for o in cur["options"] if not o["_dots"]]
                    for o, dd in zip(empty, orphans):
                        o["_dots"].append(dd)
                    if len(orphans) != len(empty):
                        cur["_orphan_dots"] = orphans[len(empty):]
                questions.append(cur)
            cur = None

        for pno, page in enumerate(doc):
            # rendu pour la 2e méthode de détection
            zoom = 3
            render = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))

            items = []
            for b in page.get_text("dict")["blocks"]:
                for l in b.get("lines", []):
                    spans = [s for s in l["spans"]]
                    if not spans:
                        continue
                    y = l["bbox"][1]
                    s0 = spans[0]
                    if s0["color"] == LETTER and s0["size"] < 8:
                        y -= 4  # la lettre (petite police) est 2 pt plus bas que le texte de l'option
                    items.append(("text", y, l["bbox"][0], spans, l["bbox"]))
            for info in page.get_image_info(xrefs=True):
                bb = info["bbox"]
                w = bb[2] - bb[0]
                if w < 14:
                    xr = info["xref"]
                    if xr not in xref_yellow:
                        xref_yellow[xr] = is_yellow_pixmap(fitz.Pixmap(doc, xr)) if xr else 0
                    # méthode 2 : pixels du rendu au centre de la case
                    cx0, cy0 = int((bb[0] + 2) * zoom), int((bb[1] + 2) * zoom)
                    cx1, cy1 = int((bb[2] - 2) * zoom), int((bb[3] - 2) * zoom)
                    yel = tot = 0
                    for py in range(cy0, cy1):
                        for px in range(cx0, cx1):
                            r, g, bl = render.pixel(px, py)[:3]
                            tot += 1
                            if r > 200 and g > 150 and bl < 120:
                                yel += 1
                    items.append(("dot", bb[1], bb[0], (xref_yellow[xr] > 0.15, yel / max(tot, 1) > 0.15, pno, [round(v, 1) for v in bb]), bb))
                else:
                    items.append(("bigimg", bb[1], bb[0], info, bb))
            items.sort(key=lambda it: (round(it[1]), it[2]))

            for kind, y, x, data, bb in items:
                if kind == "bigimg":
                    big_images.append({"annee": year, "page": pno + 1, "bbox": [round(v, 1) for v in bb],
                                       "epreuve": epreuve, "after_q": cur["numero"] if cur else None,
                                       "xref": data["xref"], "w": data["width"], "h": data["height"]})
                    continue
                if kind == "dot":
                    if y < 120 and x > 400:  # légende
                        continue
                    if cur:
                        cur["_dots_all"].append((pno, y, data))
                    continue
                spans = data
                text = "".join(s["text"] for s in spans)
                if bb[2] > 520:
                    text = text.rstrip() + WRAP  # ligne pleine : coupée par la mise en page
                s0 = spans[0]
                if y < 30 or y > 795:
                    continue  # en-tête / pied de page
                m = re.match(r"\s*Examen:\s*", text)
                if m:
                    title = text.split("Examen:")[1]
                    # le titre peut continuer sur la ligne suivante, mais le code est dans la 1re
                    close()
                    epreuve = epreuve_code(title)
                    continue
                if re.match(r"(Copie n°|Reference de l'examen|Attention, l'étudiant|Légende|à cocher)", text.strip()):
                    continue
                if epreuve is None:
                    continue
                if s0["color"] == WHITE and re.fullmatch(r"\s*\d+\s*", s0["text"]) and "Bold" in s0["font"]:
                    close()
                    num = int(s0["text"])
                    rest = "".join(s["text"] for s in spans[1:]).strip()
                    if rest and bb[2] > 520:
                        rest += WRAP
                    cur = {"annee": year, "epreuve_raw": epreuve, "numero": num, "page": pno + 1, "y": round(y),
                           "enonce_lines": [rest] if rest else [], "options": [], "corrige_lines": [],
                           "points": None, "type": None, "_dots_all": []}
                    continue
                if cur is None:
                    # suite d'un titre d'examen sur deux lignes, etc.
                    continue
                if s0["color"] == WHITE and "point" in s0["text"]:
                    m = re.search(r"([\d.,]+)\s*points?\s*/\s*([\d.,]+)", s0["text"])
                    cur["points"] = float(m.group(2).replace(",", "."))
                    cur["type"] = "ouverte" if "ouverte" in text else "qcm" if "choix" in text else text
                    continue
                if s0["color"] == LETTER and re.fullmatch(r"[A-Z]\s*", s0["text"]) and s0["size"] < 8:
                    cur["options"].append({"lettre": s0["text"].strip(), "lines": [], "_y": y, "_page": pno, "_dots": []})
                    continue
                if s0["color"] == GREEN:
                    t = re.sub(r"^\s*Indication/Right answer\s*:\s*", "", text)
                    cur["corrige_lines"].append(t)
                    continue
                if text.strip() in ("Question à choix multiple", "Question ouverte"):
                    cur["type"] = cur["type"] or ("ouverte" if "ouverte" in text else "qcm")
                    continue
                if cur["points"] is not None:
                    # nouvelle question dont la case numéro est absente du PDF
                    num = cur["numero"] + 1
                    close()
                    cur = {"annee": year, "epreuve_raw": epreuve, "numero": num, "page": pno + 1, "y": round(y),
                           "enonce_lines": [text], "options": [], "corrige_lines": [],
                           "points": None, "type": None, "_dots_all": [], "_numero_deduit": True}
                    continue
                if cur["options"]:
                    cur["options"][-1]["lines"].append(text)
                elif cur["corrige_lines"]:
                    cur["corrige_lines"].append(text)
                else:
                    cur["enonce_lines"].append(text)
        close()
        all_q.extend(questions)

    (OUT / "raw_questions.json").write_text(json.dumps(all_q, ensure_ascii=False, indent=1, default=str))
    (OUT / "big_images.json").write_text(json.dumps(big_images, ensure_ascii=False, indent=1))
    print(len(all_q), "questions;", len(big_images), "grandes images")


if __name__ == "__main__":
    main()
