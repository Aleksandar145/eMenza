# Figma integracija (eMenza)

Izvor dizajna za eMenza portal. Koristi **Figma Remote MCP** u Cursor-u umesto Stitch-a za design-to-code sync.

## Figma fajl

| Polje | Vrednost |
|---|---|
| Naziv | Untitled |
| URL | https://www.figma.com/design/oBZJ0VXwrGmQ07ehdNjjV0/Untitled |
| File key | `oBZJ0VXwrGmQ07ehdNjjV0` |

## Mapiranje ekrana → node ID

| Ekran | Node ID | Link |
|---|---|---|
| Početna (Dashboard) | `21:38` | [Otvori frame](https://www.figma.com/design/oBZJ0VXwrGmQ07ehdNjjV0/Untitled?node-id=21-38) |
| Moje rezervacije | `76:318` | [Otvori frame](https://www.figma.com/design/oBZJ0VXwrGmQ07ehdNjjV0/Untitled?node-id=76-318) |

Node ID format: URL `node-id=21-38` → MCP/API `21:38`.

## Design tokeni (iz Figme)

| Token | Vrednost |
|---|---|
| Pozadina | `#EFF1F4` |
| Akcent (primary) | `#5055D2` |
| Font | Fustat |
| Doručak | zelena |
| Ručak | plava |
| Večera | žuta |

## MCP setup u Cursor-u

**Status:** Figma plugin instaliran, MCP povezan (OAuth OK).

Autentifikovani korisnik: proveri sa `whoami` MCP tool-om u agent modu.

### 1. Konfiguracija (projekat)

Server `figma` je u [`.cursor/mcp.json`](.cursor/mcp.json) pored `stitch`:

```json
"figma": {
  "url": "https://mcp.figma.com/mcp"
}
```

Opciono: u agent chatu ukucaj `/add-plugin figma` da instaliraš ili ažuriraš zvanični Figma plugin (MCP + Agent Skills). Plugin je već aktivan u ovom projektu.

### 2. OAuth (obavezno, jednokratno)

1. Restartuj Cursor da učita novi `mcp.json`.
2. Otvori **Settings → Tools & MCP** (ili Features → MCP Servers).
3. Uključi server **`figma`**.
4. Klikni **Connect** → **Open** → **Allow access** u Figma prozoru.
5. Status mora biti zelen (connected).

Bez OAuth-a agent ne može čitati fajl.

### 3. Verifikacija

U agent modu, pošalji:

```text
Pročitaj Figma dizajn za Početnu:
https://www.figma.com/design/oBZJ0VXwrGmQ07ehdNjjV0/Untitled?node-id=21-38
```

Agent treba da koristi Figma MCP (`get_design_context`, `get_variable_defs`) i vrati layout, boje i komponente.

## Prompt za design sync

```text
Implementiraj / uskladi Početnu stranicu prema Figma frame-u 21:38 u fajlu oBZJ0VXwrGmQ07ehdNjjV0.
Koristi FIGMA.md tokeni (#EFF1F4, #5055D2, Fustat). React + Tailwind u src/components/dashboard/.
```

## Napomene

- **Stitch** (`STITCH.md`) ostaje u projektu kao legacy; za novi dizajn koristi Figma MCP.
- Remote MCP ne zahteva Figma desktop app.
- Za pisanje u Figma canvas: učitaj skill `figma-use` pre `use_figma` tool-a.
