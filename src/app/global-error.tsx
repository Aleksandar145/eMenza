"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[app] global error", error);
  }, [error]);

  return (
    <html lang="sr">
      <body style={{ background: "#F6F7FB", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "Inter, -apple-system, Segoe UI, Roboto, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 24,
              background: "#fff",
              borderRadius: 16,
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ fontSize: 32, fontWeight: 700, color: "#5055D2", margin: 0 }}>
              !
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: "8px 0 0", color: "#111" }}>
              Nešto nije u redu
            </h1>
            <p style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", margin: "8px 0 0" }}>
              Došlo je do neočekivane greške. Možete pokušati ponovo.
            </p>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                onClick={reset}
                type="button"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "#5055D2",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}