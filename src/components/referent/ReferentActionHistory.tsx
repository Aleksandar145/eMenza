"use client";

import { type ReferentActionLog } from "@/lib/referent-cards-mock";

type ReferentActionHistoryProps = {
  logs: ReferentActionLog[];
};

const actionLabels: Record<ReferentActionLog["action"], string> = {
  activate: "Aktivacija",
  block: "Blokada",
  unblock: "Deblokada",
  top_up: "Dopuna",
  extend: "Produženje",
  refund: "Refundacija",
  reversal: "Opoziv",
};

export function ReferentActionHistory({ logs }: ReferentActionHistoryProps) {
  if (logs.length === 0) {
    return (
      <p className="rounded-xl bg-[#EFF1F4]/70 px-4 py-3 text-sm text-black/55">
        Još nema zabeleženih akcija za ovu karticu.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {logs.map((log) => (
        <li className="rounded-xl border border-black/5 bg-[#EFF1F4]/40 px-4 py-3" key={log.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-[#5055D2]">
              {actionLabels[log.action]}
            </span>
            <time className="text-xs text-black/45">
              {new Intl.DateTimeFormat("sr-RS", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(log.at))}
            </time>
          </div>
          <p className="mt-1 text-sm text-black/70">{log.detail}</p>
          <p className="mt-1 text-xs text-black/45">{log.referentName}</p>
        </li>
      ))}
    </ul>
  );
}

export default ReferentActionHistory;
