export type ReferentAdminNotice = {
  id: string;
  title: string;
  message: string;
  time: string;
  priority?: "info" | "important";
  isInternal?: boolean;
  displayMode?: "standard" | "popup";
};

export const referentAdminNotices: ReferentAdminNotice[] = [
  {
    id: "ref-n1",
    title: "Radno vreme šaltera",
    message:
      "Subotom referent služba radi do 14:00. U nedelju je šalter zatvoren — bankarske uplate se i dalje knjiže automatski.",
    time: "3. mart 2026.",
    priority: "important",
  },
  {
    id: "ref-n2",
    title: "Ažurirana procedura aktivacije",
    message:
      "Od 1. marta obavezno proverite broj indeksa i broj kartice pre aktivacije. QR sken olakšava pretragu.",
    time: "1. mart 2026.",
    priority: "info",
  },
  {
    id: "ref-n3",
    title: "Podsetnik za mesečne izveštaje",
    message:
      "Mesečni izveštaj gotovinskih dopuna potrebno je zatvoriti do 5. u mesecu. Koristite opciju štampanja na stranici Izveštaji.",
    time: "28. februar 2026.",
    priority: "info",
  },
  {
    id: "ref-n4",
    title: "Planirano održavanje sistema",
    message:
      "Noću 10. marta (23:00–01:00) mogući su kratki prekidi u radu portala. Ručna dopuna na šalteru ostaje dostupna.",
    time: "27. februar 2026.",
    priority: "important",
  },
];

export function getReferentAdminNotices() {
  return referentAdminNotices;
}
