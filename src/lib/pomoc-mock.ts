import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  LayoutDashboard,
  MessageSquareText,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

export type HelpSection = {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  steps?: string[];
  tips?: string[];
};

export type HelpFaqItem = {
  question: string;
  answer: string;
};

export const helpIntro = {
  title: "Kako koristiti eMenza",
  description:
    "eMenza portal vam omogućava da rezervišete obroke, pratite stanje na kartici, pregledate statistiku potrošnje i ostavite utisak o restoranu — sve na jednom mestu.",
};

export const helpSections: HelpSection[] = [
  {
    id: "navigacija",
    title: "Navigacija kroz portal",
    summary:
      "Glavni meni se nalazi u levom sidebaru. Odavde pristupate svim delovima aplikacije.",
    icon: LayoutDashboard,
    steps: [
      "Početna — pregled današnjeg menija, kalendara i stanja na kartici.",
      "Moje rezervacije — istorija porudžbina i detalji budućih obroka.",
      "Statistika — broj obroka po tipu i trend potrošnje.",
      "Knjiga utisaka — ocenite iskustvo i pročitajte komentare drugih korisnika.",
      "Podešavanja — profil, lozinka i preferencije naloga.",
    ],
  },
  {
    id: "rezervacije",
    title: "Rezervacija obroka",
    summary:
      "Obrok rezervišete preko kalendara na Početnoj ili stranici Moje rezervacije, dugmetom Kreiraj tanjir.",
    icon: CalendarDays,
    steps: [
      "Otvorite kalendar i izaberite datum za koji želite da rezervišete.",
      "Kliknite Kreiraj tanjir i izaberite obrok (doručak, ručak ili večera).",
      "Potvrdite izbor — rezervacija se pojavljuje u kalendaru i u detaljima obroka.",
      "Rezervaciju možete otkazati istim tokom, najkasnije 24 sata pre serviranja.",
    ],
    tips: [
      "Hrana se može zakazati i otkazati najkasnije 24h pre serviranja.",
      "Na kalendaru obojene tačke označavaju koje obroke ste već rezervisali za taj dan.",
    ],
  },
  {
    id: "kartica",
    title: "eMenza kartica i stanje",
    summary:
      "Na Početnoj i stranici Moje rezervacije prikazana je kartica sa trenutnim stanjem sredstava.",
    icon: CreditCard,
    steps: [
      "Stanje na kartici ažurira se nakon svake uplate ili kupovine obroka.",
      "Broj kartice unosite pri registraciji i koristite ga za identifikaciju u menzi.",
      "Ako stanje nije dovoljno za obrok, dopunite karticu pre dolaska u restoran.",
    ],
  },
  {
    id: "dopuna",
    title: "Dopuna sredstava",
    summary:
      "Sredstva dopunjavate uplatom sa lične bankarske kartice preko mobilne ili internet banke.",
    icon: Wallet,
    steps: [
      "Na kartici stanja kliknite dugme DOPUNI.",
      "Pratite korake u uputstvu: otvorite banku, izaberite uplatu karticom.",
      "Unesite IBAN primaoca, iznos i poziv na broj sa vašim studentskim indeksom.",
      "Potvrdite uplatu — sredstva stižu na karticu u roku od 1–2 radna dana.",
    ],
    tips: [
      "Minimalni iznos dopune je 500 RSD.",
      "Nakon uplate proverite stanje na Početnoj stranici portala.",
    ],
  },
  {
    id: "menza",
    title: "Preuzimanje obroka u menzi",
    summary:
      "U restoranu se identifikujete eMenza karticom u vremenskom okviru serviranja za izabrani obrok.",
    icon: UtensilsCrossed,
    steps: [
      "Dođite u menzu u radno vreme za obrok koji ste rezervisali.",
      "Priložite karticu ili skenirajte je na terminalu — obrok se automatski naplaćuje.",
      "Proverite da li imate dovoljno sredstava pre dolaska.",
    ],
    tips: [
      "Radno vreme po obrocima prikazano je u tabeli ispod.",
      "Vikendom serviranje traje kraće nego radnim danima.",
    ],
  },
  {
    id: "obavestenja",
    title: "Obaveštenja",
    summary:
      "Važne informacije o rezervacijama, uplatama i administraciji stižu putem obaveštenja.",
    icon: Bell,
    steps: [
      "Kliknite ikonu zvona u gornjem desnom uglu da otvorite listu obaveštenja.",
      "Filtrirajte po kategorijama: Rezervacije, Plaćanja, Administracija.",
      "Klik na obaveštenje ga označava kao pročitano.",
      "Koristite Označi sve kao pročitano za brzo čišćenje liste.",
    ],
  },
  {
    id: "statistika",
    title: "Statistika potrošnje",
    summary:
      "Pratite koliko obroka ste pojeli po tipu i kako se menja vaša potrošnja kroz vreme.",
    icon: ChartNoAxesCombined,
    steps: [
      "Otvorite Statistika u sidebaru.",
      "Pregledajte raspodelu obroka (doručak, ručak, večera) i ukupan broj.",
      "Promenite period (nedeljno, mesečno, godišnje) za trend potrošnje.",
      "U tabeli transakcija vidite istoriju pojedinačnih kupovina.",
    ],
  },
  {
    id: "utisci",
    title: "Knjiga utisaka",
    summary:
      "Podelite iskustvo sa restoranom i pročitajte šta drugi korisnici misle o obrocima.",
    icon: MessageSquareText,
    steps: [
      "Otvorite Knjiga utisaka u sidebaru.",
      "Ocenite obrok zvezdicama i ostavite kratak komentar.",
      "Možete ostaviti anoniman utisak ako ne želite da se prikaže vaše ime.",
      "Filtrirajte listu po oceni da brže pronađete relevantne komentare.",
    ],
  },
];

export const helpFaq: HelpFaqItem[] = [
  {
    question: "Do kada mogu da otkažem rezervaciju?",
    answer:
      "Rezervaciju možete otkazati najkasnije 24 sata pre planiranog serviranja obroka. Nakon tog roka otkazivanje nije moguće putem portala.",
  },
  {
    question: "Koliko traje dopuna kartice?",
    answer:
      "Sredstva uplaćena preko banke obično stižu na eMenza karticu u roku od 1–2 radna dana. Proverite stanje na Početnoj stranici nakon uplate.",
  },
  {
    question: "Gde vidim stanje na kartici?",
    answer:
      "Trenutno stanje prikazano je na kartici na Početnoj stranici i na stranici Moje rezervacije, u gornjem levom delu ekrana.",
  },
  {
    question: "Šta ako nemam dovoljno sredstava za obrok?",
    answer:
      "Obrok se ne može preuzeti ako na kartici nema dovoljno sredstava. Dopunite karticu pre dolaska u menzu — kliknite DOPUNI na kartici stanja i pratite uputstvo za uplatu.",
  },
  {
    question: "Kako promenim lozinku ili podatke profila?",
    answer:
      "Podatke naloga možete izmeniti u Podešavanjima, dostupnim iz donjeg dela sidebar menija.",
  },
  {
    question: "Mogu li rezervisati više obroka za isti dan?",
    answer:
      "Da. Za svaki dan možete rezervisati doručak, ručak i večeru nezavisno, ukoliko su dostupni u meniju za taj datum.",
  },
];

export type HelpContact = {
  title: string;
  email: string;
  phone: string;
  hours: string;
  note: string;
};

export const helpContact: HelpContact = {
  title: "Kontakt podrške",
  email: "podrska@emenza.rs",
  phone: "+381 11 123 4567",
  hours: "Ponedeljak – petak, 08:00 – 16:00",
  note: "Za probleme sa uplatama ili stanjem na kartici pripremite broj kartice i studentski indeks pre kontakta.",
};
