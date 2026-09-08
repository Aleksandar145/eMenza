/** Shared visual tokens for the statistics dashboard. */
export const statsHeroGradient =
  "bg-gradient-to-br from-[#5055D2] via-[#5a5fd8] to-[#9093E1]";

export const statsHeroShadow = "shadow-[0_4px_28px_rgba(80,85,210,0.28)]";

export const statsCard =
  "rounded-[20px] border border-black/[0.06] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]";

export const statsCardHover =
  "transition-all duration-300 hover:border-[#5055D2]/15 hover:shadow-[0_8px_32px_rgba(80,85,210,0.12)]";

export const statsGradientBtnStyle = {
  backgroundImage: "linear-gradient(95deg, #5055D2 0%, #6368e0 45%, #9093E1 100%)",
} as const;

export const statsGradientBtn =
  "rounded-full font-semibold text-white shadow-[0_4px_16px_rgba(80,85,210,0.32)] transition-all hover:shadow-[0_6px_20px_rgba(80,85,210,0.4)] hover:brightness-105 active:scale-[0.98]";

export const statsGlassOnDark =
  "border border-white/20 bg-white/12 backdrop-blur-md";

export const statsGlassOnLight =
  "border border-white/70 bg-white/80 backdrop-blur-sm";

export const statsSectionLabel =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40";

export const statsOrbPrimary =
  "pointer-events-none absolute rounded-full bg-white/15 blur-3xl";

export const statsOrbSecondary =
  "pointer-events-none absolute rounded-full bg-[#9093E1]/25 blur-2xl";
