"use client";

import { useMemo } from "react";
import { useStudentCardContext } from "@/hooks/useStudentCard";
import { useStudentSession } from "@/hooks/useStudentSession";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useClerkProfileImageUrl } from "@/contexts/ClerkProfileImageContext";
import { isClerkEnabledClient } from "@/lib/clerk-config";
import { accountBalance, studentProfile } from "@/lib/dashboard-mock";
import { buildStudentAvatarUrl, buildStudentSubtitle } from "@/lib/student-avatar";
import { parseStudentDisplayName, resolveStudentProfileKind } from "@/lib/student-profile";
import type { RegisterRole } from "@/lib/register-mock";
import type { CardStatus } from "@/lib/referent-cards-mock";

export type StudentProfileView = {
  userId: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  faculty: string;
  generation: string;
  indexNumber: string;
  religion: string;
  cardNumber: string;
  subtitle: string;
  avatarUrl: string;
  avatarFallbackUrl: string;
  balanceRsd: number;
  balanceFormatted: string;
  currency: string;
  cardStatus: CardStatus;
  isDemo: boolean;
  studentKind: RegisterRole;
  isIdentityLoaded: boolean;
  isLoaded: boolean;
};

export function useStudentProfile(): StudentProfileView {
  const {
    isAuthenticated,
    isDemo,
    isReady: sessionReady,
    session,
    isLoggingOut,
    usesBackend,
  } = useStudentSession();
  const { settings, isLoaded: settingsLoaded } = useUserSettings();
  const { snapshot, cardState, cardProfile } = useStudentCardContext();
  const clerkAvatarUrl = useClerkProfileImageUrl();
  const clerkEnabled = isClerkEnabledClient();

  return useMemo(() => {
    const profile = settings.profile;
    const activeSession = session;
    const sessionName = activeSession?.displayName?.trim() ?? "";
    const sessionParts = sessionName ? parseStudentDisplayName(sessionName) : null;
    const profileReady = settingsLoaded || isDemo || !usesBackend;
    const canShowRemoteAvatar = isAuthenticated && !isLoggingOut;

    let firstName = profile.firstName.trim();
    let lastName = profile.lastName.trim();

    if (!firstName && activeSession?.firstName) {
      firstName = activeSession.firstName;
    }
    if (!lastName && activeSession?.lastName) {
      lastName = activeSession.lastName;
    }

    if (!firstName && sessionParts?.firstName) {
      firstName = sessionParts.firstName;
    }
    if (!lastName && sessionParts?.lastName) {
      lastName = sessionParts.lastName;
    }

    if (isDemo && !firstName) {
      const demoParts = parseStudentDisplayName(studentProfile.name);
      firstName = demoParts.firstName;
      lastName = demoParts.lastName;
    }

    const displayName =
      `${firstName} ${lastName}`.trim() ||
      sessionName ||
      (isDemo ? studentProfile.name : "");

    const cardFaculty =
      cardProfile?.faculty && cardProfile.faculty !== "—" ? cardProfile.faculty.trim() : "";
    const faculty = profile.faculty.trim() || activeSession?.faculty?.trim() || cardFaculty;
    const generation = profile.generation.trim();
    const studentKind = resolveStudentProfileKind({
      studentKind: (cardProfile?.role as RegisterRole | undefined) ?? profile.studentKind ?? activeSession?.studentKind,
      indexNumber: activeSession?.indexNumber,
      generation,
    });
    const indexNumber = studentKind === "student" ? generation || activeSession?.indexNumber?.trim() || "" : "";
    const fallbackAvatarUrl = buildStudentAvatarUrl(firstName, lastName, displayName || sessionName);
    const hasResolvedIdentity = Boolean(displayName.trim());
    const hasSessionIdentity = Boolean(
      activeSession?.firstName || activeSession?.lastName || activeSession?.displayName,
    );
    const isIdentityLoaded =
      isDemo ||
      !usesBackend ||
      hasResolvedIdentity ||
      (sessionReady && Boolean(activeSession) && (hasSessionIdentity || settingsLoaded));

    return {
      userId: activeSession?.userId ?? null,
      firstName,
      lastName,
      displayName,
      email: profile.email || activeSession?.email || "",
      faculty,
      generation: indexNumber,
      indexNumber,
      religion: profile.religion,
      cardNumber: profile.cardNumber,
      subtitle: buildStudentSubtitle({
        kind: studentKind,
        schoolOrFaculty: faculty,
        indexNumber: indexNumber || undefined,
      }),
      avatarUrl: canShowRemoteAvatar
        ? clerkEnabled
          ? clerkAvatarUrl || fallbackAvatarUrl
          : clerkAvatarUrl || activeSession?.avatarUrl || fallbackAvatarUrl
        : fallbackAvatarUrl,
      avatarFallbackUrl: fallbackAvatarUrl,
      balanceRsd: snapshot.balanceRsd,
      balanceFormatted: snapshot.balanceFormatted,
      currency: accountBalance.currency,
      cardStatus: snapshot.effectiveStatus,
      isDemo,
      studentKind,
      isIdentityLoaded,
      isLoaded: isIdentityLoaded && profileReady,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cardProfile,
    cardState,
    clerkAvatarUrl,
    clerkEnabled,
    isAuthenticated,
    isDemo,
    isLoggingOut,
    session,
    sessionReady,
    settings.profile,
    settingsLoaded,
    snapshot.balanceFormatted,
    snapshot.balanceRsd,
    snapshot.effectiveStatus,
    usesBackend,
  ]);
}
