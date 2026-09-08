"use client";

import {
  religionOptions,
  religionPreferenceDescription,
  type UserReligion,
} from "@/lib/user-preferences";

const labelClassName =
  "text-xs font-semibold uppercase tracking-wide text-black/45";

type ReligionPickerFieldsetProps = {
  value: UserReligion | "";
  onChange: (religion: UserReligion) => void;
  error?: string;
  idPrefix?: string;
};

export function ReligionPickerFieldset({
  value,
  onChange,
  error,
  idPrefix = "religion",
}: ReligionPickerFieldsetProps) {
  return (
    <fieldset className="space-y-2">
      <legend className={labelClassName}>Veroispovest</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {religionOptions.map((option) => {
          const isActive = value === option.id;

          return (
            <button
              aria-pressed={isActive}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-[#5055D2] bg-[#5055D2]/10 text-[#5055D2]"
                  : "border-black/8 bg-white text-black/65 hover:border-[#5055D2]/25"
              }`}
              id={`${idPrefix}-${option.id}`}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <p className="rounded-xl bg-[#EFF1F4]/70 px-4 py-3 text-xs font-light leading-relaxed text-black/60 lg:text-sm">
        {religionPreferenceDescription}
      </p>
    </fieldset>
  );
}

export default ReligionPickerFieldset;
