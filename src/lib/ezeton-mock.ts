import { getZetonDepositRsd } from "@/lib/admin-system-store";

export type ZetonStatus = "none" | "active" | "used";

export type ZetonEventType =
  | "meal_claimed"
  | "cutlery_taken"
  | "cutlery_returned"
  | "token_purchased";

export type ZetonEvent = {
  id: string;
  type: ZetonEventType;
  timestamp: string;
  label: string;
  detail: string;
  actor?: "user" | "admin";
};

export type UserZetonState = {
  status: ZetonStatus;
  tokenCode: string;
  mealName: string | null;
  mealSlot: string | null;
  claimedAt: string | null;
  usedAt: string | null;
};

export const ezetonIntro = {
  title: "eZeton — pribor uz obrok",
  description:
    "Kada preuzmete obrok, dobijate digitalni žeton vezan za QR kod obroka. Istim kodom uzimate pribor u restoranu. Žeton se deaktivira dok ne vratite pribor — tada ga administrator ponovo aktivira.",
};

export function getEzetonIntroDescription(): string {
  const deposit = getZetonDepositRsd();
  if (deposit <= 0) {
    return ezetonIntro.description;
  }

  return `${ezetonIntro.description} Kaucija za žeton iznosi ${deposit.toLocaleString("sr-RS")} RSD i vraća se po vraćanju pribora.`;
}

export const ezetonFlowSteps = [
  { step: 1, title: "Preuzmite obrok", description: "Rezervišite i preuzmite jelo u restoranu." },
  { step: 2, title: "Aktivirajte žeton", description: "Žeton se automatski dodeljuje uz obrok." },
  { step: 3, title: "Uzmi pribor", description: "Pokažite QR kod obroka na šalteru za pribor." },
  { step: 4, title: "Vratite pribor", description: "Administrator vraća žeton nakon vraćanja." },
];

export const initialZetonState: UserZetonState = {
  status: "active",
  tokenCode: "EZ-284719",
  mealName: "Pileći file + Pirinač",
  mealSlot: "Ručak · 20.03.2026.",
  claimedAt: "2026-03-20T12:05:00",
  usedAt: null,
};

export const initialZetonHistory: ZetonEvent[] = [
  {
    id: "evt-4",
    type: "cutlery_returned",
    timestamp: "2026-03-19T13:42:00",
    label: "Pribor vraćen",
    detail: "Administrator je ponovo aktivirao vaš žeton.",
    actor: "admin",
  },
  {
    id: "evt-3",
    type: "cutlery_taken",
    timestamp: "2026-03-19T12:18:00",
    label: "Pribor preuzet",
    detail: "Žeton iskorišćen za pribor uz ručak.",
    actor: "user",
  },
  {
    id: "evt-2",
    type: "meal_claimed",
    timestamp: "2026-03-19T12:05:00",
    label: "Obrok preuzet",
    detail: "Bečka šnicla + Krompir — žeton aktiviran.",
    actor: "user",
  },
  {
    id: "evt-1",
    type: "cutlery_returned",
    timestamp: "2026-03-18T13:30:00",
    label: "Pribor vraćen",
    detail: "Administrator je ponovo aktivirao vaš žeton.",
    actor: "admin",
  },
];

export const zetonStatusLabels: Record<
  ZetonStatus,
  { label: string; description: string; tone: "success" | "warning" | "muted" }
> = {
  none: {
    label: "Nema aktivnog žetona",
    description: "Preuzmite obrok da biste dobili žeton za pribor.",
    tone: "muted",
  },
  active: {
    label: "Žeton aktivan",
    description: "Koristite QR kod obroka na šalteru za pribor.",
    tone: "success",
  },
  used: {
    label: "Žeton iskorišćen",
    description: "Pribor je preuzet. Vratite pribor — administrator će vam vratiti žeton.",
    tone: "warning",
  },
};

export function formatZetonTimestamp(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateTokenCode() {
  return `EZ-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function claimZetonWithMeal(
  state: UserZetonState,
  mealName: string,
  mealSlot: string,
): { state: UserZetonState; event: ZetonEvent } {
  const now = new Date().toISOString();
  const event: ZetonEvent = {
    id: `evt-${Date.now()}`,
    type: "meal_claimed",
    timestamp: now,
    label: "Obrok preuzet",
    detail: `${mealName} — žeton aktiviran.`,
    actor: "user",
  };

  return {
    state: {
      status: "active",
      tokenCode: state.status === "none" ? generateTokenCode() : state.tokenCode,
      mealName,
      mealSlot,
      claimedAt: now,
      usedAt: null,
    },
    event,
  };
}

export function consumeZetonForCutlery(state: UserZetonState): {
  state: UserZetonState;
  event: ZetonEvent | null;
} {
  if (state.status !== "active") {
    return { state, event: null };
  }

  const now = new Date().toISOString();
  const event: ZetonEvent = {
    id: `evt-${Date.now()}`,
    type: "cutlery_taken",
    timestamp: now,
    label: "Pribor preuzet",
    detail: "Žeton deaktiviran dok ne vratite pribor.",
    actor: "user",
  };

  return {
    state: {
      ...state,
      status: "used",
      usedAt: now,
    },
    event,
  };
}

export function purchaseZetonWithDeposit(state: UserZetonState): {
  ok: true;
  state: UserZetonState;
  event: ZetonEvent;
} | { ok: false; error: string } {
  if (state.status !== "none") {
    return { ok: false, error: "Već imate aktiviran žeton." };
  }

  const now = new Date().toISOString();
  const deposit = getZetonDepositRsd();
  const event: ZetonEvent = {
    id: `evt-${Date.now()}`,
    type: "token_purchased",
    timestamp: now,
    label: "Žeton kupljen",
    detail:
      deposit > 0
        ? `Kaucija uplaćena — žeton aktiviran.`
        : "Žeton aktiviran.",
    actor: "user",
  };

  return {
    ok: true,
    state: {
      status: "active",
      tokenCode: generateTokenCode(),
      mealName: null,
      mealSlot: null,
      claimedAt: now,
      usedAt: null,
    },
    event,
  };
}

export function reactivateZetonWithDeposit(state: UserZetonState): {
  ok: true;
  state: UserZetonState;
  event: ZetonEvent;
} | { ok: false; error: string } {
  if (state.status !== "used") {
    return { ok: false, error: "Žeton nije iskorišćen." };
  }

  const now = new Date().toISOString();
  const deposit = getZetonDepositRsd();
  const event: ZetonEvent = {
    id: `evt-${Date.now()}`,
    type: "token_purchased",
    timestamp: now,
    label: "Žeton reaktiviran",
    detail:
      deposit > 0
        ? `Kaucija uplaćena — žeton ponovo aktivan.`
        : "Žeton ponovo aktiviran.",
    actor: "user",
  };

  return {
    ok: true,
    state: {
      ...state,
      status: "active",
      usedAt: null,
    },
    event,
  };
}

export function adminReturnCutlery(state: UserZetonState): {
  state: UserZetonState;
  event: ZetonEvent | null;
} {
  if (state.status !== "used") {
    return { state, event: null };
  }

  const now = new Date().toISOString();
  const event: ZetonEvent = {
    id: `evt-${Date.now()}`,
    type: "cutlery_returned",
    timestamp: now,
    label: "Pribor vraćen",
    detail: "Administrator je ponovo aktivirao vaš žeton.",
    actor: "admin",
  };

  return {
    state: {
      ...state,
      status: "active",
      usedAt: null,
    },
    event,
  };
}

export function getMojZetonHref() {
  return "/moj-zeton";
}
