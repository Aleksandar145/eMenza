type SettingsFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
};

export function SettingsField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  autoComplete,
  disabled = false,
}: SettingsFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor={id}>
        {label}
      </label>
      <input
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-black/8 bg-white px-4 py-2.5 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 disabled:cursor-not-allowed disabled:bg-[#EFF1F4] disabled:text-black/45 aria-[invalid=true]:border-red-400"
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
