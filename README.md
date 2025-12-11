# JBZ Game Website — Static SPA

Website voor de anesthesiologendagen van het JBZ. Dit is een volledig statische, client‑only Single Page Application (SPA) waarmee spelers genummerde opdrachten kunnen openen en een antwoord/password kunnen invullen. Bij een correct antwoord verschijnt de pubquiz‑vraag voor die opdracht. Er is geen backend of database nodig; host op GitHub Pages of vergelijkbaar.

Belangrijkste eigenschappen
- Volledig statisch, privacy‑vriendelijk (geen trackers, geen externe CDNs)
- Werkt offline na eerste load (Service Worker)
- Mobile‑first en toegankelijk (toetsenbord, screenreader, contrast)
- Validatie via gehashte antwoorden (salt optioneel). Geen plaintext antwoorden in de repo.

# Antwoorden voor opdrachten encrypten

Volg onderstaande stappen voor ieder antwoord.
Stap 1: Genereer een random string (salt): 
    ga naar https://csprng.eu/
    selecteer 'Salt (16B)' bij presets
    selecteer Base64 bij output format
    kopieer het resultaat

Stap 2: Genereer een hash van de salt + het antwoord:
    ga naar https://md5decrypt.net/en/Sha256/
    typ het volgende in het linker tekstvak: <salt_uit_stap_1>:<gewenst_antwoord>
    klik op encrypt
    kopieer het resultaat

Zet de salt en hash in assignments.json
    "answerCombined": "<salt_uit_stap_1>:<hash_uit_stap_2>"

Node
  npx http-server -p 5173 -c-1 .

Content maken (geen plaintext antwoorden committen)
Er zijn nu drie ondersteunde formaten voor antwoorden in `assignments.json` (je kunt kiezen wat bij je past):

1) Enkel veld, géén salt (nieuw en simpel)
   - Veld: `answerHash`
   - Waarde: `"<sha256_hex_van_genormaliseerd_antwoord>"`
   - De app vergelijkt `sha256(<genormaliseerd_input>)` met deze waarde.
   - Makkelijkst als je alleen wilt voorkomen dat antwoorden leesbaar zijn. Let op: identieke antwoorden hebben identieke hashes.

2) Enkel veld met salt (bestaand)
   - Veld: `answerCombined`
   - Waarde: `"<salt>:<sha256_hex>"` of `"sha256:<salt>:<sha256_hex>"`
   - Het hash is van de string `"<salt>:<genormaliseerd_antwoord>"` met SHA‑256 (hex).
   - Vermijdt dat gelijke antwoorden hetzelfde hash krijgen in verschillende opdrachten.

3) Gescheiden velden (voor meerdere varianten)
   - Velden: `answerSalt` plus `answerHashes` (array) of `answerHash` (enkel)
   - Gebruik dit wanneer je meerdere geaccepteerde varianten wilt ondersteunen (alle varianten met dezelfde salt hashen en in de array zetten).

Let op: Normalisatie is belangrijk. Voor het (eventueel) hashen moet het antwoord:
- worden getrimd en spaties worden samengevoegd,
- naar lowercase worden omgezet (case‑insensitive),
- diakritische tekens worden verwijderd (banána → banana),
- leestekens/symbolen worden gestript ("Banana!" → "banana").

Je kunt de offline script `scripts/offline_hash.mjs` gebruiken om dit automatisch goed te doen. Voorbeeld invoer (CSV) → JSON items.

  node scripts/offline_hash.mjs << 'EOF'
  id,title,description,answers,reveal
  1,Startopdracht,Vind de code op de poster in de lobby.,JBZ2025|jbz-2025,Welke kleur heeft de lamp op de OK?
  EOF

Assignments JSON schema (voorbeelden)
{
  "game": {
    "name": "JBZ Anesthesiologendagen",
    "edition": "2025",
    "startAt": "2025-12-11T09:00:00+01:00"
  },
  "assignments": [
    {
      "id": 1,
      "title": "Startopdracht",
      "description": "Vind de code op de poster in de lobby.",
      // Optie A: Unsalted (simpel)
      "answerHash": "<sha256_hex_van_genormaliseerd_antwoord>",
      // OF optie B: Enkel veld met salt
      // "answerCombined": "<salt>:<sha256_hex_van_salt:genormaliseerd_antwoord>",
      // OF optie C: Gescheiden velden (meerdere varianten mogelijk)
      // "answerSalt": "<generated>",
      // "answerHashes": ["<sha256(salt:normalizedVariant)>"] ,
      "case": "insensitive",
      "trim": true,
      "reveal": { "type": "text", "content": "Welke kleur heeft de lamp op de OK?" },
      "hints": ["Check de linkerhoek."]
    }
  ]
}

Deploy (GitHub Pages)
1) Commit & push main.
2) GitHub → Settings → Pages → Deploy from branch → main, root.

Beveiliging/Privacy
- Antwoorden nooit in plaintext; alleen gehashte waarden (salt optioneel).
- Beschermt tegen casual spoilers. Sterke aanvallers zouden brute‑force kunnen proberen; kies bij voorkeur niet‑triviale wachtwoorden.

Online tool gebruiken (hash genereren)
- Stap 1: Normaliseer je antwoord (trim, lowercase, diakritiek/leestekens weg, spaties samenvoegen). Voorbeeld: `" Banána!  "` → `"banana"`.
- Unsalted (eenvoudigst): bereken SHA‑256 (hex) van alleen de genormaliseerde tekst. Plak als `"answerHash": "<hex>"`.
- Salted enkel veld (optioneel): kies een willekeurige salt en bereken SHA‑256 (hex) van `"<salt>:<genormaliseerd>"`. Plak als `"answerCombined": "<salt>:<hex>"`.

Meerdere varianten nodig?
- Gebruik dan de gescheiden velden (`answerSalt` + `answerHashes`) of (unsalted) bereken meerdere hashes van elke genormaliseerde variant en zet ze in `answerHashes`.

Licentie
MIT (pas aan naar wens).
