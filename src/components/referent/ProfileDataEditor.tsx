"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { StaffCard, staffButtonPrimaryClass, staffButtonSecondaryClass } from "@/components/staff";
import { useToast } from "@/components/shared/toast/useToast";
import { useReferentSession } from "@/hooks/useReferentSession";
import { updateCardProfileData } from "@/lib/referent-cards-store";
import { resolveProfileChangeRequest } from "@/lib/profile-change-requests-store";
import type { ProfileChangeRequest } from "@/lib/profile-change-requests-store";
import { FACULTY_OPTIONS, SCHOOL_OPTIONS, type StudentCard } from "@/lib/referent-cards-mock";

type ProfileDataEditorProps = {
  card: StudentCard;
  request: ProfileChangeRequest;
  onSuccess: () => void;
};

export function ProfileDataEditor({ card, request, onSuccess }: ProfileDataEditorProps) {
  const { session } = useReferentSession();
  const toast = useToast();

  const nameParts = card.studentName.split(" ");
  const [firstName, setFirstName] = useState(nameParts[0] ?? "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");
  const [email, setEmail] = useState(card.email);
  const [cardNumber, setCardNumber] = useState(card.cardNumber);
  const [role, setRole] = useState<"ucenik" | "student">(card.role);
  const optionsForRole = role === "ucenik" ? SCHOOL_OPTIONS : FACULTY_OPTIONS;
  const [faculty, setFaculty] = useState(() => {
    const initial = card.faculty;
    const allOptions: readonly string[] = [...FACULTY_OPTIONS, ...SCHOOL_OPTIONS];
    return allOptions.includes(initial) ? initial : optionsForRole[0];
  });
  const [indexNumber, setIndexNumber] = useState(card.indexNumber);
  const [isSaving, setIsSaving] = useState(false);

  function handleRoleChange(newRole: "ucenik" | "student") {
    setRole(newRole);
    const newOptions: readonly string[] = newRole === "ucenik" ? [...SCHOOL_OPTIONS] : [...FACULTY_OPTIONS];
    if (!newOptions.includes(faculty)) {
      setFaculty(newOptions[0]);
    }
  }

  async function handleSave() {
    if (!session) return;
    setIsSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      await updateCardProfileData(card.id, {
        studentName: fullName || undefined,
        email: email.trim() || undefined,
        role,
        faculty,
        indexNumber: indexNumber.trim() || undefined,
        cardNumber: cardNumber.trim() || undefined,
      }, session.displayName);

      resolveProfileChangeRequest(request.id, session.displayName);
      toast.success("Lični podaci su izmenjeni.");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Izmena nije uspela.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDismiss() {
    if (!session) return;
    resolveProfileChangeRequest(request.id, session.displayName);
    toast.info("Zahtev je odbijen.");
    onSuccess();
  }

  const inputClass =
    "w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm focus:border-[#5055D2] focus:outline-none focus:ring-2 focus:ring-[#5055D2]/20";
  const selectClass = inputClass;
  const schoolOrFacultyLabel = role === "ucenik" ? "Škola" : "Fakultet";

  return (
    <StaffCard
      actions={
        <button
          aria-label="Zatvori"
          className="rounded-xl p-1.5 text-black/45 transition-colors hover:bg-black/5 hover:text-black/70"
          onClick={handleDismiss}
          type="button"
        >
          <X aria-hidden="true" size={18} />
        </button>
      }
      padding="md"
      title="Zahtev za izmenu podataka"
    >
      <p className="mb-4 text-xs text-[var(--text-muted)]">
        Student je zatražio izmenu ličnih podataka. Izmenite željena polja i sačuvajte.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="pe-first-name">
            Ime
          </label>
          <input
            className={inputClass}
            id="pe-first-name"
            onChange={(event) => setFirstName(event.target.value)}
            value={firstName}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="pe-last-name">
            Prezime
          </label>
          <input
            className={inputClass}
            id="pe-last-name"
            onChange={(event) => setLastName(event.target.value)}
            value={lastName}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="pe-email">
            Email
          </label>
          <input
            className={inputClass}
            id="pe-email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="pe-card-number">
            Broj kartice
          </label>
          <input
            className={inputClass}
            id="pe-card-number"
            onChange={(event) => setCardNumber(event.target.value)}
            value={cardNumber}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/45">
            Tip korisnika
          </label>
          <div className="flex gap-2">
            {(["ucenik", "student"] as const).map((option) => (
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  role === option
                    ? "bg-[#5055D2] text-white"
                    : "border border-black/10 bg-white text-black/60 hover:bg-black/5"
                }`}
                key={option}
                onClick={() => handleRoleChange(option)}
                type="button"
              >
                {option === "ucenik" ? "Učenik" : "Student"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="pe-faculty">
            {schoolOrFacultyLabel}
          </label>
          <select
            className={selectClass}
            id="pe-faculty"
            onChange={(event) => setFaculty(event.target.value)}
            value={faculty}
          >
            {optionsForRole.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        {role === "student" ? (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-black/45" htmlFor="pe-index">
              Broj indeksa
            </label>
            <input
              className={inputClass}
              id="pe-index"
              onChange={(event) => setIndexNumber(event.target.value)}
              value={indexNumber}
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          className={staffButtonPrimaryClass}
          disabled={isSaving}
          onClick={() => void handleSave()}
          type="button"
        >
          {isSaving ? "Čuvanje…" : "Sačuvaj izmene"}
        </button>
        <button
          className={staffButtonSecondaryClass}
          disabled={isSaving}
          onClick={() => void handleDismiss()}
          type="button"
        >
          Odbaci zahtev
        </button>
      </div>
    </StaffCard>
  );
}

export default ProfileDataEditor;
