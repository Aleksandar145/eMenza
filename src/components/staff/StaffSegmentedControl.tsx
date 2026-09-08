type StaffSegmentedControlOption<T extends string> = {
  id: T;
  label: string;
};

type StaffSegmentedControlProps<T extends string> = {
  options: StaffSegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function StaffSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: StaffSegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--card-border)] bg-white p-1 shadow-[var(--shadow-sm)]">
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              selected
                ? "bg-[#5055D2] text-white shadow-sm"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]"
            }`}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
