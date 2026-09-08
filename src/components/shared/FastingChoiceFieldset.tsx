"use client";

import { CalendarDays, CircleHelp, Leaf, Moon } from "lucide-react";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { FastingCollapsibleSection } from "@/components/shared/FastingCollapsibleSection";
import {
  clearFastingChoiceForPeriod,
  getFastingChoiceForPeriod,
  getFastingChoiceStatusLabel,
  getFastingChoiceStatusTone,
  getSettingsFastingPeriod,
  isOptInFastingSeasonActive,
  setFastingChoiceForPeriod,
  supportsFastingSettings,
  type FastingChoice,
  type FastingPeriodKey,
  type FastingPreferences,
} from "@/lib/fasting-preferences";
import type { UserReligion } from "@/lib/user-preferences";

type FastingChoiceFieldsetProps = {
  religion: UserReligion | "";
  fasting: FastingPreferences;
  onChange: (fasting: FastingPreferences) => void;
  idPrefix?: string;
};

type ChoiceOption = { id: FastingChoice; label: string; description: string };

const sredaPetakChoiceOptions: ChoiceOption[] = [
  {
    id: "postim",
    label: "Postim",
    description: "AI i meni će na sredu i petak prioritizovati posna jela i posni kalendar.",
  },
  {
    id: "ne_postim",
    label: "Ne postim",
    description: "Bez posebnih posnih preporuka za sredu i petak.",
  },
  {
    id: "preskoci",
    label: "Preskoči",
    description: "Zadržite podrazumevani prikaz — možete promeniti izbor kasnije.",
  },
];

const velikiPostChoiceOptions: ChoiceOption[] = [
  {
    id: "postim",
    label: "Postim",
    description: "Tokom celog Velikog posta AI i meni nude posna jela i dnevni posni kalendar.",
  },
  {
    id: "ne_postim",
    label: "Ne postim",
    description: "Bez posebnih posnih preporuka tokom Velikog posta.",
  },
  {
    id: "preskoci",
    label: "Preskoči",
    description: "Zadržite podrazumevani prikaz — možete promeniti izbor kasnije.",
  },
];

const ramazanChoiceOptions: ChoiceOption[] = [
  {
    id: "postim",
    label: "Postim",
    description:
      "Tokom celog ramazana AI i meni nude posna jela, dnevni kalendar i opciju „poneti“ za iftar.",
  },
  {
    id: "ne_postim",
    label: "Ne postim",
    description: "Bez posebnih posnih preporuka tokom ramazana.",
  },
  {
    id: "preskoci",
    label: "Preskoči",
    description: "Zadržite podrazumevani prikaz — možete promeniti izbor kasnije.",
  },
];

type FastingChoiceButtonsProps = {
  choiceOptions: ChoiceOption[];
  currentChoice: FastingChoice | null;
  fieldIdPrefix: string;
  footerNote: string;
  intro: string;
  onChoice: (choice: FastingChoice) => void;
  onClearChoice: () => void;
};

function FastingChoiceButtons({
  choiceOptions,
  currentChoice,
  fieldIdPrefix,
  footerNote,
  intro,
  onChoice,
  onClearChoice,
}: FastingChoiceButtonsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-light leading-relaxed text-black/65">{intro}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {choiceOptions.map((option) => {
          const isActive = currentChoice === option.id;

          return (
            <button
              aria-pressed={isActive}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? "border-[#5055D2] bg-[#5055D2]/10 text-[#5055D2]"
                  : "border-black/8 bg-white text-black/65 hover:border-[#5055D2]/25"
              }`}
              id={`${fieldIdPrefix}-${option.id}`}
              key={option.id}
              onClick={() => onChoice(option.id)}
              type="button"
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <p
                className={`mt-1 text-xs font-light leading-relaxed ${
                  isActive ? "text-[#5055D2]/80" : "text-black/55"
                }`}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
      {currentChoice ? (
        <button
          className="text-sm font-semibold text-[#5055D2] transition-colors hover:underline"
          onClick={onClearChoice}
          type="button"
        >
          Poništi izbor
        </button>
      ) : (
        <p className="text-xs font-medium text-[#5055D2]">
          Izaberite jednu od opcija iznad, zatim kliknite Sačuvaj na dnu stranice.
        </p>
      )}
      <p className="text-xs font-light leading-relaxed text-black/55">{footerNote}</p>
    </div>
  );
}

function buildChristianSummary(
  sredaPetakChoice: FastingChoice | null,
  velikiPostChoice: FastingChoice | null,
  showVelikiPostSeason: boolean,
) {
  const parts = [`Sreda/petak: ${getFastingChoiceStatusLabel(sredaPetakChoice)}`];

  if (showVelikiPostSeason) {
    parts.push(`Veliki post: ${getFastingChoiceStatusLabel(velikiPostChoice)}`);
  }

  return parts.join(" · ");
}

export function FastingChoiceFieldset({
  religion,
  fasting,
  onChange,
  idPrefix = "fasting",
}: FastingChoiceFieldsetProps) {
  const todayDateKey = useTodayDateKey();
  const settingsPeriod = getSettingsFastingPeriod(religion);
  const showVelikiPostSeason = religion === "hristijanstvo" && isOptInFastingSeasonActive(religion, todayDateKey);

  if (religion === "islam") {
    const showRamazanSeason = isOptInFastingSeasonActive(religion, todayDateKey);
    const ramazanChoice = getFastingChoiceForPeriod(fasting, "ramazan");
    const openRamazanByDefault = showRamazanSeason && ramazanChoice === null;

    function handleRamazanChoice(choice: FastingChoice) {
      onChange(setFastingChoiceForPeriod(fasting, "ramazan", choice));
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
            Post i posna hrana
          </p>
          <p className="mt-1 text-sm font-light text-black/55">
            Ramazan: {getFastingChoiceStatusLabel(ramazanChoice)}
          </p>
        </div>

        {showRamazanSeason ? (
          <FastingCollapsibleSection
            defaultOpen={openRamazanByDefault}
            icon={Moon}
            statusLabel={getFastingChoiceStatusLabel(ramazanChoice)}
            statusTone={getFastingChoiceStatusTone(ramazanChoice)}
            subtitle="Sezona aktivna — izbor za ceo period"
            title="Post tokom ramazana"
          >
            <FastingChoiceButtons
              choiceOptions={ramazanChoiceOptions}
              currentChoice={ramazanChoice}
              fieldIdPrefix={`${idPrefix}-ramazan`}
              footerNote="Važi za ceo period ramazana dok traje sezona."
              intro="Da li planirate da postite tokom celog ramazana?"
              onChoice={handleRamazanChoice}
              onClearChoice={() => onChange(clearFastingChoiceForPeriod(fasting, "ramazan"))}
            />
          </FastingCollapsibleSection>
        ) : (
          <FastingCollapsibleSection
            defaultOpen={false}
            icon={Moon}
            statusLabel="Info"
            statusTone="neutral"
            subtitle="Pitanje o postu stiže 3 dana pre ramazana"
            title="Post tokom ramazana"
          >
            <p className="text-sm font-light leading-relaxed text-black/65">
              Pitanje da li postite tokom ramazana stiže{" "}
              <strong className="font-semibold text-black/75">3 dana pre početka</strong> putem
              obaveštenja u aplikaciji. Tokom sezone možete izabrati i ovde u Profilu.
            </p>
          </FastingCollapsibleSection>
        )}

        <FastingCollapsibleSection
          defaultOpen={false}
          icon={CircleHelp}
          statusLabel="Info"
          statusTone="neutral"
          subtitle="AI, popup i obaveštenja"
          title="Kako radi u aplikaciji"
        >
          <ul className="list-disc space-y-2 pl-5 text-sm font-light leading-relaxed text-black/65">
            <li>
              <strong className="font-semibold text-black/75">Ramazan</strong> — posebno pitanje 3
              dana pre početka (popup), a tokom sezone možete izabrati i ovde u Profilu.
            </li>
            <li>
              Ako postite, dobijate dnevni posni kalendar, AI preporuke i opciju „poneti“ obrok za
              iftar.
            </li>
            <li>
              Religijska obaveštenja uključujete u tabu{" "}
              <strong className="font-semibold text-black/75">Obaveštenja</strong>.
            </li>
          </ul>
        </FastingCollapsibleSection>
      </div>
    );
  }

  if (!supportsFastingSettings(religion) || !settingsPeriod) {
    return (
      <FastingCollapsibleSection
        defaultOpen={false}
        icon={Leaf}
        statusLabel="Info"
        statusTone="neutral"
        subtitle="Izaberite veroispovest iznad"
        title="Post i posna hrana"
      >
        <p className="text-sm font-light leading-relaxed text-black/65">
          Izaberite <strong className="font-semibold text-black/75">Hrišćanstvo</strong> iznad da
          biste se izjasnili da li postite posnu sredu i petak. Izbor za Veliki post dobijate
          posebnim pitanjem 3 dana pre početka posta.
        </p>
      </FastingCollapsibleSection>
    );
  }

  const sredaPetakPeriod: FastingPeriodKey = settingsPeriod;
  const sredaPetakChoice = getFastingChoiceForPeriod(fasting, sredaPetakPeriod);
  const velikiPostChoice = getFastingChoiceForPeriod(fasting, "veliki_post");

  const openVelikiPostByDefault = showVelikiPostSeason && velikiPostChoice === null;
  const openSredaPetakByDefault = !openVelikiPostByDefault && sredaPetakChoice === null;

  function handleSredaPetakChoice(choice: FastingChoice) {
    onChange(setFastingChoiceForPeriod(fasting, sredaPetakPeriod, choice));
  }

  function handleVelikiPostChoice(choice: FastingChoice) {
    onChange(setFastingChoiceForPeriod(fasting, "veliki_post", choice));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-black/45">
          Post i posna hrana
        </p>
        <p className="mt-1 text-sm font-light text-black/55">
          {buildChristianSummary(sredaPetakChoice, velikiPostChoice, showVelikiPostSeason)}
        </p>
      </div>

      <FastingCollapsibleSection
        defaultOpen={openSredaPetakByDefault}
        icon={CalendarDays}
        statusLabel={getFastingChoiceStatusLabel(sredaPetakChoice)}
        statusTone={getFastingChoiceStatusTone(sredaPetakChoice)}
        subtitle="Pravoslavna posna sreda i petak tokom godine"
        title="Posna sreda i petak"
      >
        <FastingChoiceButtons
          choiceOptions={sredaPetakChoiceOptions}
          currentChoice={sredaPetakChoice}
          fieldIdPrefix={`${idPrefix}-sreda-petak`}
          footerNote="Važi svake srede i petka, nezavisno od Velikog posta."
          intro={
            showVelikiPostSeason
              ? "Da li postite posnu sredu i petak tokom godine?"
              : "Da li postite posnu sredu i petak? Za Veliki post dobijate posebno pitanje 3 dana pre početka."
          }
          onChoice={handleSredaPetakChoice}
          onClearChoice={() => onChange(clearFastingChoiceForPeriod(fasting, sredaPetakPeriod))}
        />
      </FastingCollapsibleSection>

      {showVelikiPostSeason ? (
        <FastingCollapsibleSection
          defaultOpen={openVelikiPostByDefault}
          icon={Leaf}
          statusLabel={getFastingChoiceStatusLabel(velikiPostChoice)}
          statusTone={getFastingChoiceStatusTone(velikiPostChoice)}
          subtitle="Sezona aktivna — izbor za ceo period"
          title="Veliki post"
        >
          <FastingChoiceButtons
            choiceOptions={velikiPostChoiceOptions}
            currentChoice={velikiPostChoice}
            fieldIdPrefix={`${idPrefix}-veliki-post`}
            footerNote="Važi za ceo period Velikog posta dok traje sezona."
            intro="Da li planirate da postite tokom celog Velikog posta?"
            onChoice={handleVelikiPostChoice}
            onClearChoice={() => onChange(clearFastingChoiceForPeriod(fasting, "veliki_post"))}
          />
        </FastingCollapsibleSection>
      ) : null}

      <FastingCollapsibleSection
        defaultOpen={false}
        icon={CircleHelp}
        statusLabel="Info"
        statusTone="neutral"
        subtitle="AI, popup i obaveštenja"
        title="Kako radi u aplikaciji"
      >
        <ul className="list-disc space-y-2 pl-5 text-sm font-light leading-relaxed text-black/65">
          <li>
            <strong className="font-semibold text-black/75">Posna sreda i petak</strong> — stalni
            izbor u Profilu; utiče na AI preporuke i posni kalendar svake srede i petka.
          </li>
          <li>
            <strong className="font-semibold text-black/75">Veliki post</strong> — posebno pitanje 3
            dana pre početka (popup), a tokom sezone možete izabrati i ovde u Profilu.
          </li>
          <li>
            Religijska obaveštenja uključujete u tabu{" "}
            <strong className="font-semibold text-black/75">Obaveštenja</strong>.
          </li>
        </ul>
      </FastingCollapsibleSection>
    </div>
  );
}

export default FastingChoiceFieldset;
