import type { ReactNode } from "react";
import { authInputClassName, authLabelClassName } from "@/components/auth/auth-form-styles";

type AuthFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
  leadingIcon?: ReactNode;
};

export function AuthField({
  id,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
  inputMode,
  leadingIcon,
}: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className={authLabelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35">
            {leadingIcon}
          </span>
        ) : null}
        <input
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={`${authInputClassName} ${leadingIcon ? "pl-11" : ""}`}
          id={id}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default AuthField;
