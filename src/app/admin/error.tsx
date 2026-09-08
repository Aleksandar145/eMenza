"use client";

import { useEffect } from "react";

type AdminErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminErrorPage({ error, reset }: AdminErrorPageProps) {
  useEffect(() => {
    console.error("[admin] segment error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 text-center shadow-[var(--shadow-sm)]">
        <p className="text-3xl font-bold text-[#5055D2]">!</p>
        <h1 className="mt-2 text-lg font-bold text-[var(--text-primary)]">Nešto nije u redu</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Došlo je do greške pri učitavanju. Možete pokušati ponovo — vaša sesija ostaje aktivna.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            className="rounded-xl bg-[#5055D2] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            onClick={reset}
            type="button"
          >
            Pokušaj ponovo
          </button>
          <a
            className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition-colors hover:bg-black/[0.02]"
            href="/admin"
          >
            Nazad na panel
          </a>
        </div>
      </div>
    </div>
  );
}