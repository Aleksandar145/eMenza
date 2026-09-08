type StaffPanelLoadingShellProps = {
  panelLabel: string;
  accentClassName?: string;
};

export function StaffPanelLoadingShell({
  panelLabel,
  accentClassName = "text-[#5055D2]",
}: StaffPanelLoadingShellProps) {
  return (
    <div className="flex min-h-screen gap-4 bg-[#D9D9D9] p-4 font-sans text-[#1F2937] lg:p-6">
      <aside className="hidden w-[280px] shrink-0 flex-col rounded-t-3xl bg-[#EFF1F4] px-4 py-6 shadow-[0_4px_4px_rgba(0,0,0,0.25)] md:flex lg:w-[320px]">
        <div className="mb-6 px-2 text-center">
          <div className={`mx-auto h-8 w-28 animate-pulse rounded-lg bg-black/10 ${accentClassName}`} />
          <div className="mx-auto mt-2 h-3 w-36 animate-pulse rounded bg-black/10" />
        </div>
        <div className="flex flex-1 flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="h-10 animate-pulse rounded-2xl bg-black/8" key={index} />
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="mx-auto w-full max-w-md space-y-4 rounded-[20px] border border-black/5 bg-white p-8 text-center shadow-sm">
          <div className={`mx-auto h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-current ${accentClassName}`} />
          <div>
            <p className="text-base font-semibold text-black">Učitavanje panela</p>
            <p className="mt-1 text-sm text-black/55">{panelLabel}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
