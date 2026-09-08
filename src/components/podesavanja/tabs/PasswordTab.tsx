"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { SettingsShell } from "@/components/podesavanja/SettingsShell";
import { useClerkManagedStudentAuth } from "@/hooks/useClerkManagedStudentAuth";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useT } from "@/i18n/useT";
import { ApiError, apiPost } from "@/lib/api/client";
export type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type PasswordTabProps = {
  onSave: (form: PasswordFormValues) => Promise<void>;
  savedMessage: string | null;
  onClearSavedMessage: () => void;
};

type PasswordForm = PasswordFormValues;

type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

const emptyForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-black/8 bg-white py-2.5 pl-4 pr-11 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/15 disabled:cursor-not-allowed disabled:bg-[#EFF1F4] disabled:text-black/45 aria-[invalid=true]:border-red-400"
          disabled={disabled}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          readOnly={disabled}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? t("settings.password.hidePassword") : t("settings.password.showPassword")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-black/45 transition-colors hover:text-[#5055D2] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordTab({ onSave, savedMessage, onClearSavedMessage }: PasswordTabProps) {
  const { t } = useT();
  const { session } = useStudentSession();
  const isClerkManaged = useClerkManagedStudentAuth();
  const [form, setForm] = useState<PasswordForm>(emptyForm);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [resetLinkMessage, setResetLinkMessage] = useState<string | null>(null);
  const [resetLinkError, setResetLinkError] = useState<string | null>(null);
  function validatePassword(formValues: PasswordForm): PasswordErrors {
    const nextErrors: PasswordErrors = {};

    if (!formValues.currentPassword) {
      nextErrors.currentPassword = t("settings.password.currentRequired");
    }
    if (!formValues.newPassword) {
      nextErrors.newPassword = t("settings.password.newRequired");
    } else if (formValues.newPassword.length < 8) {
      nextErrors.newPassword = t("settings.password.newMinLength");
    } else if (formValues.newPassword === formValues.currentPassword) {
      nextErrors.newPassword = t("settings.password.newMustDiffer");
    }
    if (!formValues.confirmPassword) {
      nextErrors.confirmPassword = t("settings.password.confirmRequired");
    } else if (formValues.confirmPassword !== formValues.newPassword) {
      nextErrors.confirmPassword = t("settings.password.confirmMismatch");
    }

    return nextErrors;
  }

  function updateField<K extends keyof PasswordForm>(key: K, value: PasswordForm[K]) {
    onClearSavedMessage();
    setSubmitError(null);
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSave() {
    if (isClerkManaged) {
      return;
    }

    const nextErrors = validatePassword(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setSubmitError(null);

    try {
      await onSave(form);
      setForm(emptyForm);
      setErrors({});
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : t("settings.password.updateFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setForm(emptyForm);
    setErrors({});
    setSubmitError(null);
    setResetLinkMessage(null);
    setResetLinkError(null);
    onClearSavedMessage();
  }

  async function handleSendResetLink() {
    setIsSendingResetLink(true);
    setResetLinkMessage(null);
    setResetLinkError(null);

    try {
      await apiPost("/api/auth/password/reset-request");
      setResetLinkMessage(t("settings.password.resetLinkSent"));
    } catch (error) {
      setResetLinkError(
        error instanceof ApiError ? error.message : t("settings.password.resetLinkFailed"),
      );
    } finally {
      setIsSendingResetLink(false);
    }
  }
  return (
    <SettingsShell
      description={t("settings.password.description")}
      isSaving={isSaving}
      onCancel={isClerkManaged ? undefined : handleCancel}
      onSave={isClerkManaged ? undefined : () => void handleSave()}
      savedMessage={savedMessage}
      showActions={!isClerkManaged}
      title={t("settings.password.title")}
    >
      {isClerkManaged ? (
        <p className="rounded-xl bg-[#5055D2]/5 px-4 py-3 text-sm text-[#5055D2]">
          {t("settings.password.clerkManagedHint")}
        </p>
      ) : null}

      {submitError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}

      {!isClerkManaged ? (
        <>
          <div className="max-w-md space-y-4">
            <PasswordInput
              autoComplete="current-password"
              error={errors.currentPassword}
              id="password-current"
              label={t("settings.password.current")}
              onChange={(value) => updateField("currentPassword", value)}
              value={form.currentPassword}
            />

            <div className="rounded-xl border border-black/5 bg-[#EFF1F4]/50 px-4 py-3">
              <p className="text-sm font-semibold text-black">
                {t("settings.password.forgotPassword")}
              </p>
              <p className="mt-1 text-xs font-light leading-relaxed text-black/55 lg:text-sm">
                {t("settings.password.forgotPasswordDescription", {
                  email: session?.email ?? "—",
                })}
              </p>
              <button
                className="mt-3 inline-flex items-center justify-center rounded-full border-2 border-[#5055D2] bg-white px-4 py-2 text-xs font-semibold text-[#5055D2] transition-colors hover:bg-[#5055D2]/5 disabled:cursor-not-allowed disabled:opacity-60 lg:text-sm"
                disabled={isSendingResetLink || isSaving}
                onClick={() => void handleSendResetLink()}
                type="button"
              >
                {isSendingResetLink
                  ? t("settings.password.sendingResetLink")
                  : t("settings.password.sendResetLink")}
              </button>
              {resetLinkMessage ? (
                <p className="mt-3 text-xs text-[#2f8f55] lg:text-sm" role="status">
                  {resetLinkMessage}
                </p>
              ) : null}
              {resetLinkError ? (
                <p className="mt-3 text-xs text-red-600 lg:text-sm" role="alert">
                  {resetLinkError}
                </p>
              ) : null}
            </div>

            <PasswordInput              autoComplete="new-password"
              error={errors.newPassword}
              id="password-new"
              label={t("settings.password.new")}
              onChange={(value) => updateField("newPassword", value)}
              value={form.newPassword}
            />
            <PasswordInput
              autoComplete="new-password"
              error={errors.confirmPassword}
              id="password-confirm"
              label={t("settings.password.confirm")}
              onChange={(value) => updateField("confirmPassword", value)}
              value={form.confirmPassword}
            />
          </div>
          <p className="text-xs font-light text-black/45 lg:text-sm">{t("settings.password.hint")}</p>
        </>
      ) : null}
    </SettingsShell>
  );
}

export default PasswordTab;
