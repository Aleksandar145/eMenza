export type UserReligion = "islam" | "hristijanstvo" | "ne_zelim";

export const religionOptions = [
  { id: "islam" as const, label: "Islam" },
  { id: "hristijanstvo" as const, label: "Hrišćanstvo" },
  { id: "ne_zelim" as const, label: "Ne želim da se izjasnim" },
];

export const religionPreferenceDescription =
  "Pitamo za veroispovest isključivo radi personalizovanih obaveštenja u aplikaciji. Hrišćanima nudimo izbor za posnu sredu i petak u Profilu, a posebno pitanje za Veliki post 3 dana pre početka. Muslimanima pitanje o postu tokom ramazana stiže 3 dana pre početka, a tokom sezone mogu izabrati i u Profilu — uz obaveštenja za posni meni i opciju „poneti“ obrok. Ako ne želite da se izjasnite, dobićete samo opšta obaveštenja o menzi. Podatak možete kasnije promeniti u Podešavanjima.";

export function getReligionLabel(religion: UserReligion | "") {
  if (!religion) {
    return "Nije izabrano";
  }

  return religionOptions.find((option) => option.id === religion)?.label ?? religion;
}
