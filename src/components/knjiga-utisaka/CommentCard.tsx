"use client";

import { useState } from "react";
import { Star, ThumbsDown, ThumbsUp, Trash2, ChevronDown, ChevronUp, User, ShieldAlert } from "lucide-react";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import type { FeedbackComment } from "@/lib/knjiga-utisaka-mock";

const ANONYMOUS_LABEL = "Anonimni korisnik";

function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5 text-[#5055D2]">
      {Array.from({ length: 5 }).map((_, index) => {
        const isFilled = index < rating;

        return (
          <Star
            aria-hidden="true"
            className={isFilled ? "fill-current" : "text-black/15"}
            key={index}
            size={size}
          />
        );
      })}
    </div>
  );
}

export function CommentCard({
  comment,
  isLiked,
  isDisliked,
  canDelete,
  onLike,
  onDislike,
  onDelete,
}: {
  comment: FeedbackComment;
  isLiked: boolean;
  isDisliked: boolean;
  canDelete: boolean;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const displayName = comment.anonymous ? ANONYMOUS_LABEL : comment.name;
  const showAvatar =
    !comment.anonymous && comment.avatarUrl && comment.avatarFallbackUrl;

  const handleDelete = () => {
    setConfirmDelete(true);
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    setDeleting(true);
    onDelete(comment.id);
  };

  return (
    <article className="rounded-2xl border border-black/5 bg-[#EFF1F4]/60 p-3.5 transition-colors hover:bg-[#EFF1F4] lg:p-4">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {comment.anonymous ? (
            <div className="flex size-9 items-center justify-center rounded-2xl bg-white text-black/45">
              <User aria-hidden="true" size={16} />
            </div>
          ) : showAvatar ? (
            <div className="relative size-9 shrink-0 overflow-hidden rounded-2xl">
              <StudentAvatar
                alt={displayName}
                className="object-cover"
                fallbackSrc={comment.avatarFallbackUrl!}
                sizes="36px"
                src={comment.avatarUrl!}
              />
            </div>
          ) : (
            <div className="flex size-9 items-center justify-center rounded-2xl bg-[#5055D2]/10 text-xs font-bold text-[#5055D2]">
              {comment.initials}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h4
                className={`text-sm font-semibold ${
                  comment.anonymous ? "text-black/55" : "text-black"
                }`}
              >
                {displayName}
              </h4>
              {!comment.reviewed && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  <ShieldAlert size={10} />
                  Administracija još nije odgovorila
                </span>
              )}
            </div>
            <p className="text-[11px] font-light text-black/45">{comment.date}</p>
          </div>
        </div>

        <RatingStars rating={comment.rating} />
      </div>

      <p className="text-sm leading-relaxed text-black/75">
        {comment.message}
      </p>

      {comment.reviewed && comment.adminReply && (
        <div className="mt-2">
          <button
            className="flex items-center gap-1 text-[11px] font-semibold text-[#5055D2] transition-colors hover:text-[#4348B8]"
            onClick={() => setShowReply(!showReply)}
            type="button"
          >
            {showReply ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showReply ? "Sakrij odgovor" : "Vidi odgovor administratora"}
          </button>
          {showReply && (
            <div className="mt-2 rounded-xl border border-[#5055D2]/10 bg-[#5055D2]/5 px-3 py-2 text-sm leading-relaxed text-black/75">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#5055D2]/60">
                Odgovor administracije
              </p>
              <p>{comment.adminReply}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-black/5 pt-3">
        <button
          className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
            isLiked
              ? "text-[#5055D2]"
              : "text-black/45 hover:text-[#5055D2]"
          }`}
          onClick={() => onLike(comment.id)}
          type="button"
        >
          <ThumbsUp
            aria-hidden="true"
            size={12}
            className={isLiked ? "fill-current" : ""}
          />
          Saglasan sam ({comment.helpfulCount})
        </button>

        <button
          className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
            isDisliked
              ? "text-red-500"
              : "text-black/45 hover:text-red-500"
          }`}
          onClick={() => onDislike(comment.id)}
          type="button"
        >
          <ThumbsDown
            aria-hidden="true"
            size={12}
            className={isDisliked ? "fill-current" : ""}
          />
          Nisam saglasan ({comment.disagreeCount ?? 0})
        </button>

        {canDelete && (
          <button
            className="flex items-center gap-1.5 text-[11px] font-semibold text-black/45 transition-colors hover:text-red-500"
            disabled={deleting}
            onClick={handleDelete}
            type="button"
          >
            <Trash2 aria-hidden="true" size={12} />
            {deleting ? "Brisanje..." : "Obriši"}
          </button>
        )}
      </div>
      {confirmDelete && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5">
          <span className="flex-1 text-xs font-medium text-red-700">Da li ste sigurni?</span>
          <button className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700" onClick={confirmDeleteAction} type="button">Da</button>
          <button className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold text-black/60 hover:bg-black/5" onClick={() => setConfirmDelete(false)} type="button">Ne</button>
        </div>
      )}
    </article>
  );
}

export default CommentCard;
