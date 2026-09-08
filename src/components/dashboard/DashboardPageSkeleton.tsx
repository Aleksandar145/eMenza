"use client";

type DashboardPageSkeletonProps = {
  className?: string;
};

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/8 ${className}`} />;
}

export function DashboardPageSkeleton({ className = "" }: DashboardPageSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Učitavanje početne stranice" className={`space-y-5 ${className}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="card-light min-w-0 flex-1 rounded-[20px] p-2.5 lg:min-h-[96px] lg:p-3">
          <div className="flex h-full items-center gap-3 rounded-[18px] bg-[#EFF1F4] px-3 py-2.5 lg:gap-4 lg:px-4 lg:py-3">
            <SkeletonBlock className="size-11 shrink-0 rounded-full lg:size-12" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-3 w-52 max-w-full" />
            </div>
            <div className="flex shrink-0 gap-2">
              <SkeletonBlock className="size-10 rounded-xl lg:size-11" />
              <SkeletonBlock className="size-10 rounded-xl lg:size-11" />
            </div>
          </div>
        </div>
        <section className="card-light shrink-0 overflow-hidden rounded-[20px] lg:min-h-[96px] lg:w-[min(100%,420px)]">
          <div className="grid grid-cols-3 divide-x divide-black/5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="space-y-3 px-3 py-3 lg:px-5 lg:py-4" key={index}>
                <SkeletonBlock className="h-4 w-16" />
                <SkeletonBlock className="h-8 w-10" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[20px] bg-gradient-to-br from-[#5055D2]/40 via-[#5a5fd8]/35 to-[#9093E1]/30">
        <SkeletonBlock className="mx-5 mt-4 h-4 w-64 rounded-lg bg-white/25 lg:mx-6" />
        <div className="space-y-4 p-5 pt-4 lg:p-6">
          <SkeletonBlock className="h-7 w-48 rounded-lg bg-white/25" />
          <SkeletonBlock className="h-4 w-full max-w-xl rounded-lg bg-white/20" />
          <SkeletonBlock className="h-10 w-40 rounded-full bg-white/30" />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonBlock className="h-10 w-44 rounded-full" />
        <SkeletonBlock className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock className="h-24 rounded-[20px]" key={index} />
        ))}
      </div>

      <section className="rounded-[20px] border border-black/5 bg-white px-4 py-3 shadow-sm lg:px-5 lg:py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-8 w-32" />
          </div>
          <SkeletonBlock className="h-10 w-28 rounded-full" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <SkeletonBlock className="h-64 rounded-[20px]" />
        <SkeletonBlock className="h-64 rounded-[20px]" />
      </div>
    </div>
  );
}

export default DashboardPageSkeleton;
