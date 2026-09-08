import type { Granularity } from "./types";
export { formatRsd } from "@/lib/admin-helpers";

export const granularityOptions = [
  { id: "dan" as const, label: "Dan" },
  { id: "nedelja" as const, label: "Nedelja" },
  { id: "mesec" as const, label: "Mesec" },
  { id: "godina" as const, label: "Godina" },
];

export const periodLengths: Record<Granularity, number> = {
  dan: 1,
  nedelja: 7,
  mesec: 30,
  godina: 365,
};

export const dishCategoryFilterOptions = [
  { id: "all" as const, label: "Sve" },
  { id: "main" as const, label: "Glavno jelo" },
  { id: "side" as const, label: "Dodatno jelo" },
  { id: "salad" as const, label: "Salata" },
  { id: "dessert" as const, label: "Dezert" },
];

export const dishCategoryLabels: Record<string, string> = {
  main: "Glavno jelo",
  side: "Dodatno jelo",
  salad: "Salata",
  dessert: "Dezert",
};

export const mealTypeLabels: Record<string, string> = {
  breakfast: "Doručak",
  lunch: "Ručak",
  dinner: "Večera",
};

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(d)}.${Number(m)}.`;
}

export function fmtDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(day)}.${Number(m)}.`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return formatDateStr(d);
}

export function getWeekRange(dateStr: string): { from: string; to: string } {
  const monday = getMonday(dateStr);
  return { from: monday, to: addDays(monday, 6) };
}

export function getYearRange(dateStr: string): { from: string; to: string } {
  const year = new Date(dateStr + "T00:00:00").getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function getMultiYearRange(yearsBack: number = 7): { from: string; to: string } {
  const now = new Date();
  const currentYear = now.getFullYear();
  return { from: `${currentYear - yearsBack}-01-01`, to: `${currentYear}-12-31` };
}

export const MONTH_NAMES = ["Januar", "Februar", "Mart", "April", "Maj", "Jun", "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"];

export function DiffDisplay({ value }: { value: { diff: number; percent: number } }) {
  if (value.diff === 0) {
    return <span className="text-xs text-[var(--text-muted)]">—</span>;
  }
  const isPositive = value.diff > 0;
  const sign = isPositive ? "+" : "";
  return (
    <span
      className={`text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}
    >
      {sign}{value.diff} ({sign}{value.percent}%)
    </span>
  );
}

export function SectionCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] shadow-[var(--shadow)]">
      <div className="border-b border-[var(--card-border)] px-4 py-2.5">
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          {title}
        </p>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-[#f8f9fb] p-3">
      {children}
    </div>
  );
}

export function SortTh({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: string;
  current: string;
  dir: "asc" | "desc";
  onSort: (field: string, dir: "asc" | "desc") => void;
}) {
  const isActive = current === field;
  return (
    <th
      className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] cursor-pointer select-none whitespace-nowrap"
      onClick={() => onSort(field, isActive ? (dir === "asc" ? "desc" : "asc") : "asc")}
    >
      {label} {isActive ? (dir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}
