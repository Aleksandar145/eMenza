"use client";

import { useEffect } from "react";

/**
 * Clerk dev instance je vezan za `localhost` origin. Kada se app otvori preko
 * loopback aliasa (127.0.0.1, 0.0.0.0, ::1), Clerk ne inicijalizuje Google
 * prijavu i dugme ostaje disabled. Ova komponenta, koja radi u browseru gde je
 * pravi origin vidljiv, prebacuje na localhost u tom slučaju.
 */
export function DevHostRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname;
    const isLoopbackAlias =
      hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1";
    if (!isLoopbackAlias) return;

    const target = `${window.location.protocol}//localhost:${
      window.location.port || ""
    }${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (target === window.location.href) return;
    window.location.replace(target);
  }, []);

  return null;
}
