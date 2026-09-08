"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { FastingOptInModal } from "@/components/shared/FastingOptInModal";
import { useTodayDateKey } from "@/contexts/AppTimeProvider";
import { useUserSettings } from "@/hooks/useUserSettings";
import {
  getFastingOptInPrompt,
  setFastingChoiceForPeriod,
  type FastingChoice,
} from "@/lib/fasting-preferences";

type FastingOptInProviderProps = {
  children: ReactNode;
};

export function FastingOptInProvider({ children }: FastingOptInProviderProps) {
  const { settings, isLoaded, persistSettings } = useUserSettings();
  const todayDateKey = useTodayDateKey();
  const [dismissedSession, setDismissedSession] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedSession(false);
  }, [todayDateKey, settings.profile.religion]);

  const prompt = useMemo(() => {
    if (!isLoaded || dismissedSession) {
      return null;
    }

    return getFastingOptInPrompt(
      settings.profile.religion,
      todayDateKey,
      settings.fasting,
    );
  }, [dismissedSession, isLoaded, settings.fasting, settings.profile.religion, todayDateKey]);

  function saveChoice(choice: FastingChoice) {
    if (!prompt) {
      return;
    }

    persistSettings({
      ...settings,
      fasting: setFastingChoiceForPeriod(settings.fasting, prompt.period, choice),
    });
    setDismissedSession(true);
  }

  return (
    <>
      {children}
      {prompt ? (
        <FastingOptInModal
          onNePostim={() => saveChoice("ne_postim")}
          onPostim={() => saveChoice("postim")}
          onPreskoci={() => {
            saveChoice("preskoci");
          }}
          prompt={prompt}
        />
      ) : null}
    </>
  );
}

export default FastingOptInProvider;
