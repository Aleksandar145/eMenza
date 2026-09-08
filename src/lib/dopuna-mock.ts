export type TopUpStep = {
  order: number;
  title: string;
  description: string;
};

export type TopUpPaymentDetails = {
  recipient: string;
  accountNumber: string;
  purposeTemplate: string;
  studentIndex: string;
  minAmount: string;
  processingNote: string;
};

export type CashTopUpStep = {
  order: number;
  title: string;
  description: string;
};

export const cashTopUpOption = {
  title: "Gotovina kod referenta",
  intro:
    "Ne morate čekati bankarsku uplatu — možete odmah dopuniti karticu gotovinom na šalteru najbližeg referenta studentskog centra.",
  steps: [
    {
      order: 1,
      title: "Posetite referenta",
      description:
        "Dođite u studentski centar ili menzu gde radi referent služba (radno vreme pogledajte u obaveštenjima ili pitajte na info šalteru).",
    },
    {
      order: 2,
      title: "Pokažite karticu",
      description:
        "Pokažite QR kod sa stranice Moje kartice ili broj studentske kartice — referent će brzo pronaći vaš nalog.",
    },
    {
      order: 3,
      title: "Uplatite gotovinu",
      description:
        "Referent knjiži uplatu na licu mesta. Novo stanje na kartici vidljivo je odmah nakon dopune.",
    },
  ] satisfies CashTopUpStep[],
  minAmount: "500 RSD",
};

export const topUpSteps: TopUpStep[] = [
  {
    order: 1,
    title: "Otvorite bankarsku aplikaciju",
    description:
      "Pokrenite mobilnu ili internet banku banke kod koje imate debitnu ili kreditnu karticu.",
  },
  {
    order: 2,
    title: "Izaberite uplatu karticom",
    description:
      "U meniju izaberite Uplata / Plaćanje, zatim način Kartica ili Instant nalog prema uputstvu vaše banke.",
  },
  {
    order: 3,
    title: "Unesite podatke primaoca",
    description:
      "Upišite IBAN primaoca, iznos dopune i poziv na broj sa vašim studentskim indeksom (vidi podatke ispod).",
  },
  {
    order: 4,
    title: "Potvrdite uplatu",
    description:
      "Proverite unete podatke i potvrdite transakciju. Sredstva će biti vidljiva na eMenza kartici u roku od 1–2 radna dana.",
  },
];

export const topUpPaymentDetails: TopUpPaymentDetails = {
  recipient: "Studentski restoran — eMenza",
  accountNumber: "RS35 2600 0560 3001 6113 79",
  purposeTemplate: "DOPUNA-{indexBroj}",
  studentIndex: "2021/0234",
  minAmount: "500 RSD",
  processingNote:
    "Bankarska uplata se knjiži automatski u roku od 1–2 radna dana. Stanje proverite na Početnoj stranici. Za trenutnu dopunu koristite gotovinu kod referenta.",
};

export function getPaymentReference(details: TopUpPaymentDetails) {
  return details.purposeTemplate.replace("{indexBroj}", details.studentIndex);
}
