"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { CommentCard } from "@/components/knjiga-utisaka/CommentCard";
import { useAdminSystem } from "@/hooks/useAdminSystem";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import {
  deleteFeedbackEntry,
  getFeedbackEntries,
  toggleFeedbackDisagree,
  toggleFeedbackHelpful,
} from "@/lib/admin-system-store";
import { formatFeedbackDate } from "@/lib/knjiga-utisaka-mock";
import {
  deleteFeedbackEntryFromApi,
  shouldUseAdminApi,
  toggleFeedbackDisagreeFromApi,
  toggleFeedbackHelpfulFromApi,
} from "@/lib/backend/admin-api";

type Filter = "all" | "top" | "popular";
type OwnerFilter = "all" | "mine";

type FeedbackListProps = {
  className?: string;
};

const LIKED_STORAGE_KEY = "emenza-liked-feedback";
const DISLIKED_STORAGE_KEY = "emenza-disliked-feedback";

function readStoredIds(key: string): string[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
}

export function FeedbackList({ className = "" }: FeedbackListProps) {
  useAdminSystem();
  const profile = useStudentProfile();
  const [filter, setFilter] = useState<Filter>("all");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const ownerMenuRef = useRef<HTMLDivElement>(null);
  const [likedIds, setLikedIds] = useState<string[]>(() => readStoredIds(LIKED_STORAGE_KEY));
  const [dislikedIds, setDislikedIds] = useState<string[]>(() => readStoredIds(DISLIKED_STORAGE_KEY));
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!showOwnerMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (ownerMenuRef.current && !ownerMenuRef.current.contains(e.target as Node)) {
        setShowOwnerMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOwnerMenu]);

  const handleLike = async (id: string) => {
    const isLiked = likedIds.includes(id);
    const add = !isLiked;

    toggleFeedbackHelpful(id, add);
    if (shouldUseAdminApi()) {
      toggleFeedbackHelpfulFromApi(id, add).catch(() => {});
    }

    const newLiked = add ? [...likedIds, id] : likedIds.filter((x) => x !== id);
    setLikedIds(newLiked);
    writeStoredIds(LIKED_STORAGE_KEY, newLiked);

    // If was disliked, remove dislike
    if (add && dislikedIds.includes(id)) {
      toggleFeedbackDisagree(id, false);
      if (shouldUseAdminApi()) {
        toggleFeedbackDisagreeFromApi(id, false).catch(() => {});
      }
      const newDisliked = dislikedIds.filter((x) => x !== id);
      setDislikedIds(newDisliked);
      writeStoredIds(DISLIKED_STORAGE_KEY, newDisliked);
    }
  };

  const handleDislike = async (id: string) => {
    const isDisliked = dislikedIds.includes(id);
    const add = !isDisliked;

    toggleFeedbackDisagree(id, add);
    if (shouldUseAdminApi()) {
      toggleFeedbackDisagreeFromApi(id, add).catch(() => {});
    }

    const newDisliked = add ? [...dislikedIds, id] : dislikedIds.filter((x) => x !== id);
    setDislikedIds(newDisliked);
    writeStoredIds(DISLIKED_STORAGE_KEY, newDisliked);

    // If was liked, remove like
    if (add && likedIds.includes(id)) {
      toggleFeedbackHelpful(id, false);
      if (shouldUseAdminApi()) {
        toggleFeedbackHelpfulFromApi(id, false).catch(() => {});
      }
      const newLiked = likedIds.filter((x) => x !== id);
      setLikedIds(newLiked);
      writeStoredIds(LIKED_STORAGE_KEY, newLiked);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteFeedbackEntry(id);

    if (shouldUseAdminApi()) {
      deleteFeedbackEntryFromApi(id).catch(() => {});
    }

    forceUpdate((n) => n + 1);
  };

  const rawEntries = getFeedbackEntries();
  const filteredEntries =
    ownerFilter === "mine" && profile.userId
      ? rawEntries.filter((e) => e.profileId === profile.userId)
      : rawEntries;

  const feedbackComments = filteredEntries.map((entry) => {
    const isOwnEntry =
      Boolean(profile.userId) &&
      Boolean(entry.profileId) &&
      entry.profileId === profile.userId;

    return {
      id: entry.id,
      initials: entry.initials,
      name: entry.anonymous ? "Anonimni korisnik" : entry.name,
      date: formatFeedbackDate(entry.submittedAt),
      message: entry.message,
      rating: entry.rating,
      helpfulCount: entry.helpfulCount,
      disagreeCount: entry.disagreeCount,
      anonymous: entry.anonymous,
      profileId: entry.profileId,
      reviewed: entry.reviewed,
      adminReply: entry.adminReply,
      avatarUrl: isOwnEntry && !entry.anonymous ? profile.avatarUrl : undefined,
      avatarFallbackUrl: isOwnEntry && !entry.anonymous ? profile.avatarFallbackUrl : undefined,
    };
  });

  const comments =
    filter === "popular"
      ? [...feedbackComments].sort((a, b) => b.helpfulCount - a.helpfulCount)
      : filter === "top"
        ? [...feedbackComments].sort((a, b) => b.rating - a.rating)
        : feedbackComments;

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] ${className}`}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/5 px-4 py-3 lg:px-5 lg:py-4">
        <div>
          <div className="relative" ref={ownerMenuRef}>
            <button
              className="flex items-center gap-1"
              onClick={() => setShowOwnerMenu(!showOwnerMenu)}
              type="button"
            >
              <h3 className="text-base font-bold text-black lg:text-lg">
                {ownerFilter === "all" ? "Najnoviji utisci" : "Moji utisci"}
              </h3>
              <ChevronDown
                aria-hidden="true"
                className={`text-black/45 transition-transform ${
                  showOwnerMenu ? "rotate-180" : ""
                }`}
                size={14}
              />
            </button>
            {showOwnerMenu && (
              <div className="absolute left-0 top-full z-10 mt-1 w-44 overflow-hidden rounded-xl border border-black/5 bg-white shadow-lg">
                <button
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#EFF1F4] ${
                    ownerFilter === "all"
                      ? "font-semibold text-[#5055D2]"
                      : "text-black/65"
                  }`}
                  onClick={() => {
                    setOwnerFilter("all");
                    setShowOwnerMenu(false);
                  }}
                  type="button"
                >
                  Svi utisci
                </button>
                <button
                  className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-[#EFF1F4] ${
                    ownerFilter === "mine"
                      ? "font-semibold text-[#5055D2]"
                      : "text-black/65"
                  }`}
                  onClick={() => {
                    setOwnerFilter("mine");
                    setShowOwnerMenu(false);
                  }}
                  type="button"
                >
                  Moji utisci
                </button>
              </div>
            )}
          </div>
          <p className="text-xs font-light text-black/55 lg:text-sm">
            {comments.length} prikazanih utisaka
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-[#EFF1F4] p-1">
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors lg:px-4 lg:py-1.5 lg:text-sm ${
              filter === "all"
                ? "bg-[#5055D2] text-white"
                : "text-black/55 hover:text-black"
            }`}
            onClick={() => setFilter("all")}
            type="button"
          >
            Svi
          </button>
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors lg:px-4 lg:py-1.5 lg:text-sm ${
              filter === "top"
                ? "bg-[#5055D2] text-white"
                : "text-black/55 hover:text-black"
            }`}
            onClick={() => setFilter("top")}
            type="button"
          >
            Najbolje ocenjeni
          </button>
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors lg:px-4 lg:py-1.5 lg:text-sm ${
              filter === "popular"
                ? "bg-[#5055D2] text-white"
                : "text-black/55 hover:text-black"
            }`}
            onClick={() => setFilter("popular")}
            type="button"
          >
            Najlajkovanije
          </button>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4 lg:space-y-4 lg:p-5">
        {comments.map((comment) => {
          const isOwnEntry =
            Boolean(profile.userId) &&
            Boolean(comment.profileId) &&
            comment.profileId === profile.userId;

          return (
            <CommentCard
              canDelete={isOwnEntry}
              comment={comment}
              isDisliked={dislikedIds.includes(comment.id)}
              isLiked={likedIds.includes(comment.id)}
              key={comment.id}
              onDelete={handleDelete}
              onDislike={handleDislike}
              onLike={handleLike}
            />
          );
        })}
      </div>
    </section>
  );
}

export default FeedbackList;
