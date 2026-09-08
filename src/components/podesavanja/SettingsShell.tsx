"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/useT";

type SettingsShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
  onSave?: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  showActions?: boolean;
  savedMessage?: string | null;
  isSaving?: boolean;
};

export function SettingsShell({
  title,
  description,
  children,
  onSave,
  onCancel,
  saveLabel,
  showActions = true,
  savedMessage,
  isSaving = false,
}: SettingsShellProps) {
  const { t } = useT();
  const resolvedSaveLabel = saveLabel ?? t("common.save");

  return (
    <article className="rounded-[20px] border border-black/5 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
      <header className="border-b border-black/5 px-5 py-4 lg:px-6 lg:py-5">
        <h2 className="text-lg font-bold text-black lg:text-xl">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-light text-black/55 lg:text-base">{description}</p>
        ) : null}
        {savedMessage ? (
          <p className="mt-2 text-sm font-semibold text-[#2f8f55]" role="status">
            {savedMessage}
          </p>
        ) : null}
      </header>

      <div className="space-y-5 px-5 py-5 lg:px-6 lg:py-6">{children}</div>

      {showActions && onSave && onCancel ? (
        <footer className="flex flex-wrap gap-3 border-t border-black/5 bg-[#EFF1F4]/40 px-5 py-4 lg:px-6">
          <button
            className="inline-flex items-center justify-center rounded-full px-8 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(80,85,210,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 lg:text-base"
            disabled={isSaving}
            onClick={onSave}
            style={{
              backgroundImage: "linear-gradient(83deg, #5055D2 26%, #9093E1 100%)",
            }}
            type="button"
          >
            {resolvedSaveLabel}
          </button>
          <button
            className="rounded-full border-2 border-[#5055D2] bg-white px-6 py-2.5 text-sm font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5 lg:text-base"
            disabled={isSaving}
            onClick={onCancel}
            type="button"
          >
            {t("common.cancel")}
          </button>
        </footer>
      ) : null}
    </article>
  );
}
