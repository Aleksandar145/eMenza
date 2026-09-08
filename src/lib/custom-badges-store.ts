import type { CustomBadgeDef } from "@/lib/dish-catalog-mock";

const STORAGE_KEY = "emenza-custom-badges";

function read(): CustomBadgeDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomBadgeDef[];
  } catch {
    return [];
  }
}

function write(defs: CustomBadgeDef[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defs));
}

export function getCustomBadgeDefs(): CustomBadgeDef[] {
  if (typeof window === "undefined") return [];
  return read();
}

export function addCustomBadgeDef(def: Omit<CustomBadgeDef, "id">): CustomBadgeDef {
  const defs = read();
  const id = `custom-${def.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
  const entry: CustomBadgeDef = { ...def, id };
  write([...defs, entry]);
  return entry;
}

export function removeCustomBadgeDef(id: string) {
  const defs = read();
  write(defs.filter((d) => d.id !== id));
}
