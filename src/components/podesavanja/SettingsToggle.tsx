type SettingsToggleProps = {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SettingsToggle({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: SettingsToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-black/5 bg-[#EFF1F4]/50 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <label className="text-sm font-semibold text-black lg:text-base" htmlFor={id}>
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs font-light leading-relaxed text-black/55 lg:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <button
        aria-checked={checked}
        aria-labelledby={id}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5055D2]/30 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-[#5055D2]" : "bg-black/15"
        }`}
        disabled={disabled}
        id={id}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
