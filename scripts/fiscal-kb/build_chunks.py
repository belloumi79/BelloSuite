#!/usr/bin/env python3
"""
Construit data/fiscal-kb/chunks.jsonl (+ manifest.json) à partir des PDF officiels
(DGI / jibaya.tn, JORT, finances.gov.tn) téléchargés dans un dossier `sources/`.

Usage :
  python3 scripts/fiscal-kb/build_chunks.py <dossier_sources> [--out data/fiscal-kb]

Dépendances : poppler-utils (pdftotext). Aucun service payant.
Les PDF ne sont PAS commités : seuls les chunks texte et le manifest le sont.
Découpage par article ("ARTICLE N", "Art. N", "الفصل N"), sous-découpage ~800 tokens
avec chevauchement, nettoyage des en-têtes/pieds de page.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from datetime import date

# ~4 caractères / token (FR), ~3,2 (AR) : approximation suffisante pour borner les chunks.
TARGET_TOKENS = 800
OVERLAP_TOKENS = 100
CHARS_PER_TOKEN = {"fr": 4.0, "ar": 3.2}

SOURCES = [
    {
        "file": "irpp_is_2026_fr.pdf",
        "code": "IRPP_IS",
        "title": "Code de l'impôt sur le revenu des personnes physiques et de l'impôt sur les sociétés (et textes annexés)",
        "version": "2026",
        "lang": "fr",
        "url": "https://jibaya.tn/wp-content/uploads/2026/03/Code_IRPP_IS_2026_fr.pdf",
        "page": "https://jibaya.tn/docs/code-de-lirpp-et-is-2026/",
        "publisher": "DGI - jibaya.tn",
        "outdated": False,
        "kind": "code",
    },
    {
        "file": "tva_2026.pdf",
        "code": "TVA",
        "title": "مجلة الأداء على القيمة المضافة والقانون المتعلق بالمعلوم على الاستهلاك (Code de la TVA et droit de consommation)",
        "version": "2026",
        "lang": "ar",
        "url": "https://jibaya.tn/wp-content/uploads/2026/05/Code-TVA-2026.pdf",
        "page": "https://jibaya.tn/docs/code-de-la-taxe-sur-la-valeur-ajoutee-2026/",
        "publisher": "DGI - jibaya.tn",
        "outdated": False,
        "kind": "code",
    },
    {
        "file": "timbre_2026_ar.pdf",
        "code": "DET",
        "title": "مجلة معاليم التسجيل والطابع الجبائي (Code des droits d'enregistrement et de timbre)",
        "version": "2026",
        "lang": "ar",
        "url": "https://jibaya.tn/wp-content/uploads/2026/04/مجلة-معاليم-التسجيل-والطابع-الجبائي-2026-1.pdf",
        "page": "https://jibaya.tn/docs/code-des-droits-denregistrement-et-de-timbre-2026/",
        "publisher": "DGI - jibaya.tn",
        "outdated": False,
        "kind": "code",
    },
    {
        "file": "lf2026_jort_148.pdf",
        "code": "LF2026",
        "title": "Loi n° 2025-17 du 12 décembre 2025, portant loi de finances pour l'année 2026 (JORT n° 148, traduction française)",
        "version": "2026",
        "lang": "fr",
        "url": "https://lake.jort.tn/journal-officiel/fr/2025/148.pdf",
        "page": "https://lake.jort.tn/journal-officiel/fr/2025/148.pdf",
        "publisher": "JORT (Imprimerie Officielle)",
        "outdated": False,
        "kind": "loi",
        # Ne garder que la loi (le n° 148 contient ensuite l'arrêté de répartition des crédits).
        "start": r"^Loi n° 2025-17 du 12 décembre 2025, portant loi de finances pour l.année 2026\(1\)",
        "end": r"^Décrets et arrêtés\s*$",
    },
    {
        "file": "timbre_2025_fr.pdf",
        "code": "DET",
        "title": "Code des droits d'enregistrement et de timbre, ses textes d'application et textes connexes (mis à jour au 1er janvier 2025)",
        "version": "2025",
        "lang": "fr",
        "url": "https://jibaya.tn/wp-content/uploads/2025/04/Code-des-Droits-dEnregistrement-et-de-Timbre-2025.pdf",
        "page": "https://jibaya.tn/docs/code-des-droits-denregistrement-et-de-timbre-2025/",
        "publisher": "DGI - jibaya.tn",
        "outdated": True,
        "outdatedReason": "Version française 2025 ; la version 2026 n'existe qu'en arabe (DET 2026 AR).",
        "kind": "code",
    },
    {
        "file": "tva_2017_fr.pdf",
        "code": "TVA",
        "title": "Code de la TVA, loi relative au droit de consommation, textes d'application (mis à jour au 1er avril 2017)",
        "version": "2017",
        "lang": "fr",
        "url": "https://www.finances.gov.tn/sites/default/files/CODE%20TVA%202017%20FR.pdf",
        "page": "https://www.finances.gov.tn/fr/cadre-reglementaire-6",
        "publisher": "Ministère des Finances - finances.gov.tn",
        "outdated": True,
        "outdatedReason": "Version 2017 (taux 6/12/18 % remplacés par 7/13/19 % depuis la LF 2018). Seule la version 2026 arabe fait foi.",
        "kind": "code",
    },
    {
        "file": "fodec_nc13.pdf",
        "code": "FODEC",
        "title": "Note commune n° 13/2012 : liste des produits soumis à la taxe professionnelle de 1 % au profit du FODEC",
        "version": "2012",
        "lang": "fr",
        "url": "https://jibaya.tn/wp-content/uploads/2024/02/Note-commune-n-13-1-1.pdf",
        "page": "https://jibaya.tn/docs/note-commune-numero-13-fixation-de-la-liste-des-produits-soumis-a-la-taxe-professionnelle-au-taux-de-1-au-profit-du-fonds-de-developpement-de-la-competitivite-dans-les-secteurs-indust/",
        "publisher": "DGI - jibaya.tn",
        "outdated": False,
        "kind": "note_commune",
        "no_articles": True,
    },
]

BIDI = re.compile("[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]")
TATWEEL = "\u0640"

FR_ART = re.compile(
    r"^(?:ARTICLE|Article|Art\.)\s*"
    r"(PREMIER|premier|1er|unique|\d+)"
    r"(\s*(?:bis|ter|quater|quinquies|sexies|septies|octies|nonies|novies|decies|undecies|duodecies|"
    r"terdecies|quaterdecies|quindecies|sexdecies|septdecies|octodecies|novodecies|vicies|\w+decies)\b)?"
    r"(?:\s*\(\d+\))?(?:\s*\((?:nouveau|bis|ter)\))?\s*(?:nouveau\s*)?"
    r"(?:[:.\-–—]|\s*$)",
)
AR_SUFFIX = r"(?:مكرر|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تاسعا|عاشرا|حادي عشر|ثاني عشر|ثالث عشر|رابع عشر|خامس عشر)"
AR_FIRST = re.compile(r"^الفصل\s*(الأول|الاول)\b")
# pdftotext désordonne les chiffres en RTL ("الفصل -7تخضع", "الفصل )1 - I :9يطرح", "الفصل (13جديد):") :
# on lit la zone non arabe qui suit "الفصل" et on prend le dernier entier (le n° d'article).
AR_ART_ZONE = re.compile(r"^الفصل\s*([^\u0600-\u06FF]{0,20})(" + AR_SUFFIX + r")?\s*(?:\(?جديد\)?)?\s*([^\u0600-\u06FF]{0,6})")


class _ArMatch:
    def __init__(self, num, suffix):
        self._g = (num, suffix)

    def group(self, i):
        return self._g[i - 1]


class _ArArt:
    @staticmethod
    def match(t):
        m = AR_FIRST.match(t)
        if m:
            return _ArMatch("1", None)
        m = AR_ART_ZONE.match(t)
        if not m:
            return None
        zone = (m.group(1) or "") + " " + (m.group(3) or "")
        nums = re.findall(r"\d+", zone)
        if not nums:
            return None
        rest = t[m.end():].strip()
        has_punct = re.search(r"[:\-–()]", zone) is not None
        if not has_punct and not m.group(2) and rest:
            return None  # simple renvoi ("الفصل 11 من مجلة ...")
        return _ArMatch(nums[-1], m.group(2))


AR_ART = _ArArt()

FR_HEAD = re.compile(
    r"^(PREMIERE|DEUXIEME|TROISIEME|QUATRIEME|CINQUIEME)\s+PARTIE|^(CHAPITRE|TITRE|SECTION|SOUS[- ]SECTION|PARAGRAPHE|"
    r"Chapitre|Titre|Section|Sous-section)\b|^(CODE|LOI N|DECRET|DÉCRET|ARRETE|ARRÊTÉ|Loi n|Décret)\b"
)
AR_HEAD = re.compile(r"^(الجزء|الباب|القسم|الفرع|العنوان|الفقرة|قانون عدد|أمر عدد|أمر حكومي عدد|قرار)")
LEVEL = {
    "PARTIE": 0, "CODE": 0, "LOI": 0, "DECRET": 0, "ARRETE": 0,
    "TITRE": 1, "CHAPITRE": 1, "SECTION": 2, "SOUS-SECTION": 3, "PARAGRAPHE": 4,
    "الجزء": 0, "قانون": 0, "أمر": 0, "قرار": 0, "الباب": 1, "العنوان": 1, "القسم": 2, "الفرع": 3, "الفقرة": 4,
}


def fix_arabic(line: str) -> str:
    """pdftotext inverse les ligatures lam-alef (لإ -> إل) : corrige les cas sans ambiguïté
    (début de mot, éventuellement après و/ب/ف/ك/ل)."""
    line = re.sub(r"(^|[\s(«\"'])([وبفك]?)ا([إأآ])ل", r"\1\2ال\3", line)
    line = re.sub(r"(^|[\s(«\"'])([وبفك]?)اال", r"\1\2الا", line)
    # "للأداء" rendu "لألداء" : préfixe ل + ligature inversée
    line = re.sub(r"(^|[\s(«\"'])([وفك]?)ل([إأآ])ل", r"\1\2لل\3", line)
    return line


def head_level(line: str, lang: str):
    if lang == "fr":
        m = FR_HEAD.match(line)
        if not m:
            return None
        if m.group(3) and line != line.upper():
            return None  # "Décret n° ..." en casse mixte = renvoi / note, pas un titre
        u = line.upper()
        for k in ("SOUS-SECTION", "SOUS SECTION", "PARTIE", "CHAPITRE", "TITRE", "SECTION", "PARAGRAPHE", "CODE", "LOI", "DECRET", "DÉCRET", "ARRETE", "ARRÊTÉ"):
            if u.startswith(k) or (k == "PARTIE" and "PARTIE" in u.split()[1:2]):
                k = {"SOUS SECTION": "SOUS-SECTION", "DÉCRET": "DECRET", "ARRÊTÉ": "ARRETE"}.get(k, k)
                return LEVEL[k]
        return None
    m = AR_HEAD.match(line)
    if not m:
        return None
    w = m.group(1).split()[0]
    return LEVEL.get(w, 0)


def extract(path: str) -> str:
    return subprocess.run(["pdftotext", "-enc", "UTF-8", path, "-"], capture_output=True, check=True).stdout.decode("utf-8", "replace")


def clean_lines(text: str, src: dict):
    raw = [BIDI.sub("", l).replace(TATWEEL, "").replace("\uf0b7", "-").rstrip() for l in text.replace("\f", "\n").split("\n")]
    if src["lang"] == "ar":
        raw = [fix_arabic(l) for l in raw]
    if src.get("start"):
        s = next((i for i, l in enumerate(raw) if re.match(src["start"], l.strip())), 0)
        e = next((i for i, l in enumerate(raw[s + 1:], s + 1) if re.match(src["end"], l.strip())), len(raw))
        raw = raw[s:e]
    counts = Counter(l.strip() for l in raw if l.strip())
    out = []
    for l in raw:
        t = re.sub(r"\s+", " ", l).strip()
        if not t:
            out.append("")
            continue
        if re.fullmatch(r"[\d\s\-–]{1,6}", t) or re.fullmatch(r"D\.G\.I\.\s*\d+", t) or re.fullmatch(r"Page \d+", t):
            continue
        if re.search(r"\.{6,}|…{3,}", t):  # tables des matières
            continue
        if "USAGE STRICTEMENT ADMINISTRATIF" in t.upper() or "لإلستعمال الإداري" in t or "للاستعمال الإداري" in t:
            continue
        # en-têtes/pieds de page répétés (courts et fréquents)
        if len(t) < 90 and counts[l.strip()] >= 20 and not FR_ART.match(t) and not AR_ART.match(t):
            continue
        out.append(t)
    return out


def split_articles(lines, src):
    lang = src["lang"]
    heads = {}
    blocks = []  # (article, section, [lines])
    cur = {"article": None, "section": None, "lines": []}

    def section_str():
        return " > ".join(heads[k] for k in sorted(heads))[:300] or None

    pending_head = None
    for t in lines:
        if not t:
            if cur["lines"] and cur["lines"][-1] != "":
                cur["lines"].append("")
            continue
        if src.get("no_articles"):
            cur["lines"].append(t)
            continue
        m = (FR_ART if lang == "fr" else AR_ART).match(t)
        if m:
            if cur["lines"]:
                blocks.append(cur)
            num = m.group(1)
            if num in ("PREMIER", "premier", "1er", "الأول", "الاول"):
                num = "1"
            suffix = (m.group(2) or "").strip()
            art = f"{num} {suffix}".strip() if suffix else num
            cur = {"article": art, "section": section_str(), "lines": [t]}
            continue
        lvl = head_level(t, lang)
        if lvl is not None and len(t) < 160:
            heads = {k: v for k, v in heads.items() if k < lvl}
            heads[lvl] = t
            pending_head = t
            # un titre ouvre un nouveau bloc hors article (sera rattaché au suivant si court)
            if cur["lines"] and cur["article"] is not None:
                blocks.append(cur)
                cur = {"article": None, "section": section_str(), "lines": []}
            continue
        if cur["article"] is None and cur["section"] != section_str() and cur["lines"]:
            blocks.append(cur)
            cur = {"article": None, "section": section_str(), "lines": []}
        elif cur["article"] is None and not cur["lines"]:
            cur["section"] = section_str()
        cur["lines"].append(t)
    if cur["lines"]:
        blocks.append(cur)
    _ = pending_head
    return blocks


def join_text(lines, lang):
    paras, buf = [], []
    for l in lines:
        if l == "":
            if buf:
                paras.append(" ".join(buf))
                buf = []
        else:
            # recoller les césures FR
            if buf and lang == "fr" and buf[-1].endswith("-") and not buf[-1].endswith(" -"):
                buf[-1] = buf[-1][:-1] + l
            else:
                buf.append(l)
    if buf:
        paras.append(" ".join(buf))
    return "\n".join(p.strip() for p in paras if p.strip())


def sub_chunks(text, lang):
    cpt = CHARS_PER_TOKEN[lang]
    size, overlap = int(TARGET_TOKENS * cpt), int(OVERLAP_TOKENS * cpt)
    if len(text) <= size * 1.15:
        return [text]
    out, start = [], 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):
            cut = max(text.rfind("\n", start + size // 2, end), text.rfind(". ", start + size // 2, end))
            if cut > start:
                end = cut + 1
        out.append(text[start:end].strip())
        if end >= len(text):
            break
        nxt = end - overlap
        sp = text.find(" ", nxt)
        start = sp + 1 if 0 <= sp < end else nxt
    return [c for c in out if c]


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main():
    srcdir = sys.argv[1]
    outdir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "data/fiscal-kb"
    fetched = os.environ.get("FETCH_DATE", date.today().isoformat())
    os.makedirs(outdir, exist_ok=True)
    manifest, chunks = [], []
    for src in SOURCES:
        path = os.path.join(srcdir, src["file"])
        if not os.path.exists(path):
            print(f"MANQUANT: {src['file']}", file=sys.stderr)
            continue
        pages = int(re.search(r"Pages:\s+(\d+)", subprocess.run(["pdfinfo", path], capture_output=True, text=True).stdout).group(1))
        lines = clean_lines(extract(path), src)
        blocks = split_articles(lines, src)
        n_before = len(chunks)
        seen = Counter()
        for b in blocks:
            text = join_text(b["lines"], src["lang"])
            if len(text) < 40:
                continue
            parts = sub_chunks(text, src["lang"])
            key = f"{src['code']}|{src['version']}|{src['lang']}|{b['article'] or '-'}|{b['section'] or '-'}"
            seen[key] += 1
            occ = seen[key]
            for i, p in enumerate(parts):
                cid = hashlib.sha256(f"{key}|{occ}|{i}".encode()).hexdigest()[:32]
                chunks.append({
                    "id": cid,
                    "code": src["code"],
                    "article": b["article"],
                    "section": b["section"],
                    "title": src["title"],
                    "version": src["version"],
                    "lang": src["lang"],
                    "sourceUrl": src["url"],
                    "outdated": src["outdated"],
                    "kind": src["kind"],
                    "part": i + 1,
                    "parts": len(parts),
                    "content": p,
                    "contentHash": hashlib.sha256(p.encode()).hexdigest(),
                    "tokens": int(len(p) / CHARS_PER_TOKEN[src["lang"]]),
                })
        entry = {k: src[k] for k in ("code", "title", "version", "lang", "url", "page", "publisher", "outdated", "kind")}
        if src.get("outdatedReason"):
            entry["outdatedReason"] = src["outdatedReason"]
        entry.update({
            "file": src["file"], "pages": pages, "bytes": os.path.getsize(path),
            "sha256": sha256_file(path), "fetchDate": fetched,
            "chunks": len(chunks) - n_before,
            "articles": len({c["article"] for c in chunks[n_before:] if c["article"]}),
        })
        manifest.append(entry)
        print(f"{src['code']:8} {src['version']} {src['lang']}: {entry['chunks']} chunks, {entry['articles']} articles distincts", file=sys.stderr)
    with open(os.path.join(outdir, "chunks.jsonl"), "w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": fetched, "chunker": {"targetTokens": TARGET_TOKENS, "overlapTokens": OVERLAP_TOKENS}, "sources": manifest}, f, ensure_ascii=False, indent=2)
    print(f"TOTAL {len(chunks)} chunks", file=sys.stderr)


if __name__ == "__main__":
    main()
