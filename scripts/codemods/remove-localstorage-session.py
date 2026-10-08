#!/usr/bin/env python3
"""
Codemod (one-shot) : remplace la lecture de localStorage('bello_session') dans les pages client
par le hook partagé useSession() (src/components/providers/SessionProvider.tsx).

Transformations (conservatrices ; chaque fichier est ensuite relu à la main + tsc) :
  1. `const [tenantId, setTenantId] = useState('')`      -> `const { tenantId } = useSession()`
  2. `const X = localStorage.getItem('bello_session')`  -> supprimé, puis les usages de X :
       if (X) { ... }  -> contenu du bloc        if (X) stmt -> stmt
       if (!X) return  -> supprimé               if (!X) { ...; return } -> supprimé
       const { tenantId } = JSON.parse(X)        -> supprimé
       const { tenantId: tid } = JSON.parse(X)   -> const tid = tenantId
       const v = JSON.parse(X).tenantId [|| '']  -> const v = tenantId
       JSON.parse(X).tenantId [|| '']            -> tenantId
  3. lignes `setTenantId(...)`                         -> supprimées
  4. `tenantId || 'demo-tenant'`                       -> tenantId
  5. `if (!tenantId) return ...` (une ligne)           -> supprimé (le tenant est connu dès le 1er rendu)
  6. `tenantId=${x}` / `?tenantId=' + x` dans les URL  -> retiré (le serveur lit le tenant dans la session)
     `fd.append('tenantId', ...)`                      -> supprimé
  7. import { useSession } from '@/hooks/useSession'   -> ajouté

Usage : python3 scripts/codemods/remove-localstorage-session.py <fichiers...>
Ce qui ne correspond à aucun motif est laissé tel quel et signalé (revue manuelle).
"""
import re
import sys

LS = r"localStorage\.getItem\(\s*['\"]bello_session['\"]\s*\)"


def find_block_end(s: str, open_idx: int) -> int:
    """Index de l'accolade fermante correspondant à s[open_idx] == '{' (ignore chaînes simples)."""
    depth = 0
    i = open_idx
    quote = None
    while i < len(s):
        c = s[i]
        if quote:
            if c == '\\':
                i += 2
                continue
            if c == quote:
                quote = None
        elif c in '\'"`':
            quote = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError('accolade non fermée')


def dedent_block(body: str, n: int = 2) -> str:
    out = []
    for line in body.split('\n'):
        out.append(line[n:] if line.startswith(' ' * n) else line)
    return '\n'.join(out)


def transform(src: str) -> tuple[str, list[str]]:
    notes = []
    s = src

    # 1. state tenantId -> hook
    s, n1 = re.subn(
        r"const \[tenantId, setTenantId\] = useState(?:<string>)?\(\s*(?:''|\"\")\s*\);?",
        "const { tenantId } = useSession()",
        s,
    )

    # 2. variables lues depuis localStorage
    for m in list(re.finditer(r"^[ \t]*const (\w+) = " + LS + r";?[ \t]*\n", s, re.M)):
        pass
    while True:
        m = re.search(r"^[ \t]*const (\w+) = " + LS + r";?[ \t]*\n", s, re.M)
        if not m:
            break
        var = m.group(1)
        s = s[: m.start()] + s[m.end():]
        v = re.escape(var)
        # if (!X) { ...; return }  /  if (!X) return
        s = re.sub(r"^[ \t]*if \(!" + v + r"\) \{[^{}\n]*return;?\s*\}[ \t]*\n", "", s, flags=re.M)
        s = re.sub(r"^[ \t]*if \(!" + v + r"\) return;?[ \t]*\n", "", s, flags=re.M)
        # if (X) { ... }
        while True:
            mm = re.search(r"if \(" + v + r"\) \{", s)
            if not mm:
                break
            open_idx = mm.end() - 1
            close_idx = find_block_end(s, open_idx)
            body = s[open_idx + 1: close_idx]
            body = dedent_block(body.strip('\n'))
            # retire l'indentation de la 1re ligne pour la recoller après le `if` supprimé
            line_start = s.rfind('\n', 0, mm.start()) + 1
            indent = s[line_start: mm.start()]
            body_lines = [l for l in body.split('\n')]
            body = '\n'.join(body_lines).lstrip()
            s = s[: mm.start()] + body + s[close_idx + 1:]
            _ = indent
        # if (X) stmt
        s = re.sub(r"if \(" + v + r"\) (?=\S)", "", s)
        # destructurations
        s = re.sub(r"^[ \t]*const \{ tenantId \} = JSON\.parse\(" + v + r"\);?[ \t]*\n", "", s, flags=re.M)
        s = re.sub(r"const \{ tenantId \} = JSON\.parse\(" + v + r"\);?\s*", "", s)
        s = re.sub(r"const \{ tenantId: (\w+) \} = JSON\.parse\(" + v + r"\)", r"const \1 = tenantId", s)
        s = re.sub(
            r"const (\w+) = JSON\.parse\(" + v + r"\)\.tenantId(?: \|\| (?:''|\"\"))?",
            r"const \1 = tenantId",
            s,
        )
        s = re.sub(r"JSON\.parse\(" + v + r"\)\.tenantId(?: \|\| (?:''|\"\"))?", "tenantId", s)
        if re.search(r"\b" + v + r"\b", s) and re.search(r"JSON\.parse\(" + v + r"\)", s):
            notes.append(f"JSON.parse({var}) restant : revue manuelle")

    s = re.sub(
        r"\(JSON\.parse\(" + LS + r" \|\| '\{\}'\)\.tenantId \|\| ''\)",
        "tenantId",
        s,
    )

    # 3. setTenantId(...) lignes entières
    s = re.sub(r"^[ \t]*setTenantId\(.*\)\)?;?[ \t]*\n", "", s, flags=re.M)
    s = re.sub(r"setTenantId\([^()]*\);\s*", "", s)

    # 4. demo-tenant
    s = re.sub(r"tenantId \|\| ['\"]demo-tenant['\"]", "tenantId", s)

    # 5. early returns sur tenantId vide (une ligne)
    s = re.sub(r"^[ \t]*if \(!tenantId\) return;?[ \t]*\n", "", s, flags=re.M)
    s = re.sub(r"^[ \t]*if \(!tenantId\) \{ setLoading\(false\); return;? \}[ \t]*\n", "", s, flags=re.M)

    # 6. tenantId dans les URL / FormData
    s = re.sub(r"\?tenantId=\$\{\w+\}&", "?", s)
    s = re.sub(r"\?tenantId=\$\{\w+\}", "", s)
    s = re.sub(r"&tenantId=\$\{\w+\}", "", s)
    s = re.sub(r"'\?tenantId=' \+ \w+ \+ '&", "'?", s)
    s = re.sub(r"\?tenantId=' \+ \w+(?=[),])", "'", s)
    s = re.sub(r" \+ '&tenantId=' \+ \w+", "", s)
    s = re.sub(r"^[ \t]*(?:fd|formData)\.append\(['\"]tenantId['\"], [^)]*\);?[ \t]*\n", "", s, flags=re.M)
    s = s.replace("+ ''", "")

    # 7. import
    if "useSession()" in s and "@/hooks/useSession" not in s:
        lines = s.split('\n')
        last_import = max(i for i, l in enumerate(lines) if l.startswith('import '))
        # import multi-lignes : avancer jusqu'à la ligne qui ferme l'import
        j = last_import
        while not re.search(r"from ['\"][^'\"]+['\"];?\s*$", lines[j]) and j < len(lines) - 1:
            j += 1
        lines.insert(j + 1, "import { useSession } from '@/hooks/useSession'")
        s = '\n'.join(lines)

    if 'localStorage' in s and 'bello_session' in s:
        notes.append('bello_session encore présent')
    if 'setTenantId' in s:
        notes.append('setTenantId encore présent')
    if n1 == 0 and 'useSession()' not in s and 'tenantId' in s:
        notes.append('pas de state tenantId remplacé : tenantId vient-il d’ailleurs ?')
    return s, notes


if __name__ == '__main__':
    for path in sys.argv[1:]:
        with open(path, encoding='utf-8') as f:
            src = f.read()
        out, notes = transform(src)
        if out != src:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(out)
        print(('MODIFIÉ ' if out != src else 'inchangé ') + path + (('  ⚠ ' + '; '.join(notes)) if notes else ''))
