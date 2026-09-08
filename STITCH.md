# Stitch integracija

Project ID:

```text
projects/2059729257888747307
```

Ovaj projekat je pripremljen za Cursor MCP povezivanje preko `.cursor/mcp.json`.

## Povezivanje

1. U Stitch-u napravi API key ili omoguci zvanicni MCP pristup za svoj projekat.
2. U PowerShell-u postavi kljuc kao korisnicku environment varijablu:

```powershell
[Environment]::SetEnvironmentVariable("STITCH_API_KEY", "OVDE_UNESI_STITCH_API_KEY", "User")
```

3. Restartuj Cursor da bi ucitao novu environment varijablu i MCP konfiguraciju.
4. U Cursor-u otvori Settings > Tools & MCP i proveri da li je `stitch` server aktivan.

## Sledeci korak za implementaciju dizajna

Kada MCP bude aktivan, posalji poruku:

```text
Povuci Stitch dizajn iz projekta projects/2059729257888747307 i implementiraj sve ekrane u Next.js App Router projektu koristeci React, TypeScript i Tailwind.
```

Ako MCP nije dostupan, iz Stitch-a eksportuj React/Tailwind kod ili `DESIGN.md` i dodaj ga u projekat. Tada mogu direktno da prebacim sve stranice u `src/app` i komponente u `src/components`.
