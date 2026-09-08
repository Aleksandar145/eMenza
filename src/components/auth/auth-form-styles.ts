export const authInputClassName =
  "w-full rounded-xl border border-black/8 bg-white py-2.5 px-4 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 aria-[invalid=true]:border-red-400";

export const authLabelClassName =
  "text-xs font-semibold uppercase tracking-wide text-black/45";

export const authPrimaryButtonClassName =
  "flex items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 lg:text-base";

export const authPrimaryButtonStyle = {
  backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
} as const;

export const authSecondaryButtonClassName =
  "flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white py-3 text-sm font-semibold text-black/65 transition-colors hover:border-[#5055D2]/25 hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-60 lg:text-base";
