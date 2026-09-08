"use client";

import AppLayout from "@/components/layout/AppLayout";
import { FeedbackForm } from "@/components/knjiga-utisaka/FeedbackForm";
import { FeedbackList } from "@/components/knjiga-utisaka/FeedbackList";
import { FeedbackOverviewCard } from "@/components/knjiga-utisaka/FeedbackOverviewCard";

export function KnjigaUtisaka() {
  return (
    <AppLayout>
      <div className="flex h-[calc(100dvh-2.5rem)] max-h-[calc(100dvh-2.5rem)] min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-3.5rem)] lg:max-h-[calc(100dvh-3.5rem)]">
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:grid-rows-1 lg:items-stretch lg:gap-5">
          <aside className="flex min-h-0 flex-col gap-4 lg:h-full lg:gap-4">
            <FeedbackForm className="lg:flex-1" />
            <FeedbackOverviewCard className="shrink-0" />
          </aside>

          <FeedbackList className="min-h-0" />
        </div>
      </div>
    </AppLayout>
  );
}

export default KnjigaUtisaka;
