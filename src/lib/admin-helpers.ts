export function formatRsd(value: number) {
  return `${value.toLocaleString("sr-RS")} RSD`;
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return value.toLocaleString("sr-RS", options);
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
