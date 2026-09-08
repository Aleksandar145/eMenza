"use client";

import { useState } from "react";
import { Send, Star } from "lucide-react";
import { useToast } from "@/components/shared/toast/useToast";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useUserSettings } from "@/hooks/useUserSettings";
import { shouldUseAdminApi, submitFeedbackViaApi } from "@/lib/backend/admin-api";
import { applyAdminSystemState, submitFeedback } from "@/lib/admin-system-store";
import { studentProfile } from "@/lib/dashboard-mock";
import { ApiError } from "@/lib/api/client";

function RatingStars({
  rating,
  size = 24,
  onSelect,
}: {
  rating: number;
  size?: number;
  onSelect?: (value: number) => void;
}) {
  return (
    <div className="flex gap-1 text-[#5055D2]">
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        const isFilled = index < rating;

        return (
          <button
            aria-label={`Ocena ${value} od 5`}
            className="transition-transform hover:scale-110"
            key={value}
            onClick={() => onSelect?.(value)}
            type="button"
          >
            <Star
              aria-hidden="true"
              className={isFilled ? "fill-current" : "text-black/15"}
              size={size}
            />
          </button>
        );
      })}
    </div>
  );
}

type FeedbackFormProps = {
  className?: string;
};

export function FeedbackForm({ className = "" }: FeedbackFormProps) {
  const toast = useToast();
  const profile = useStudentProfile();
  const { settings } = useUserSettings();
  const [rating, setRating] = useState(4);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardBlocked = profile.cardStatus !== "active";

  async function handleSubmit() {
    if (!message.trim() || isSubmitting || cardBlocked) {
      return;
    }

    const displayName =
      `${settings.profile.firstName} ${settings.profile.lastName}`.trim() || studentProfile.name;

    setIsSubmitting(true);

    try {
      if (shouldUseAdminApi()) {
        const state = await submitFeedbackViaApi({
          name: anonymous ? "Anonimni korisnik" : displayName,
          message,
          rating,
          anonymous,
        });
        applyAdminSystemState(state);
      } else {
        submitFeedback({
          name: anonymous ? "Anonimni korisnik" : displayName,
          message,
          rating,
          anonymous,
          profileId: profile.userId ?? undefined,
        });
      }

      setSubmitted(true);
      setMessage("");
      window.setTimeout(() => setSubmitted(false), 2500);
    } catch (error) {
      const fallback =
        error instanceof ApiError ? error.message : "Slanje utiska nije uspelo. Pokušajte ponovo.";
      toast.error(fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className={`flex flex-col rounded-3xl bg-[#EFF1F4] p-4 shadow-[0_2px_16px_rgba(0,0,0,0.05)] lg:min-h-0 lg:p-5 ${className}`}
    >
      <div className="shrink-0">
        <h3 className="text-base font-bold text-black lg:text-lg">Vaš novi utisak</h3>
        <p className="mt-0.5 text-xs font-light text-black/55 lg:text-sm">
          Podelite iskustvo o hrani, usluzi ili čistoći.
        </p>
      </div>

      {submitted ? (
        <p className="mt-4 rounded-xl bg-[#2f8f55]/10 px-3 py-2 text-sm text-[#2f8f55]">
          Hvala! Vaš utisak je prosleđen administraciji.
        </p>
      ) : null}
      {cardBlocked ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Kartica nije aktivna. Aktivirajte karticu kod referenta pre nego što ostavite utisak.
        </p>
      ) : null}

      <div className="mt-4 shrink-0">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-black/45">
          Ocena kvaliteta
        </label>
        <RatingStars onSelect={setRating} rating={rating} />
      </div>

      <div className="mt-4 flex min-h-[7.5rem] flex-1 flex-col lg:min-h-0">
        <label
          className="mb-2 block shrink-0 text-xs font-semibold uppercase tracking-wide text-black/45"
          htmlFor="feedback-message"
        >
          Komentar
        </label>
        <textarea
          className="min-h-[7.5rem] w-full flex-1 resize-none rounded-2xl border border-black/10 bg-white p-3 text-sm text-black transition-colors placeholder:text-black/35 focus:border-[#5055D2] focus:outline-none lg:min-h-0"
          disabled={isSubmitting}
          id="feedback-message"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Vaš komentar..."
          value={message}
        />
      </div>

      <div className="mt-4 flex shrink-0 items-center gap-2.5">
        <input
          checked={anonymous}
          className="size-4 cursor-pointer rounded border-black/20 accent-[#5055D2]"
          disabled={isSubmitting}
          id="anonimno"
          onChange={(event) => setAnonymous(event.target.checked)}
          type="checkbox"
        />
        <label
          className="cursor-pointer select-none text-xs font-light text-black/55 lg:text-sm"
          htmlFor="anonimno"
        >
          Pošalji kao anoniman korisnik
        </label>
      </div>

      <button
        className="group mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#5055D2] py-3 font-semibold text-white transition-all hover:bg-[#4348B8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 lg:py-3.5"
        disabled={isSubmitting || !message.trim() || cardBlocked}
        onClick={() => void handleSubmit()}
        type="button"
      >
        <span>{isSubmitting ? "Slanje…" : "Pošalji utisak"}</span>
        <Send
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-1"
          size={16}
        />
      </button>
    </section>
  );
}

export default FeedbackForm;
