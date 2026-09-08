"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDemoStudentZeton,
  getEzetonHydrationRecords,
  loadEzetonRecords,
  subscribeEzeton,
  type EzetonRecord,
} from "@/lib/ezeton-store";
import { shouldUseEzetonApi, fetchMyTokenFromApi } from "@/lib/backend/ezeton-api";
import { useStudentSession } from "@/hooks/useStudentSession";
import type { UserZetonState } from "@/lib/ezeton-mock";
import type { EzetonTokenRecord } from "@/server/repositories/ezeton";

function mapServerTokenToUserState(token: EzetonTokenRecord): UserZetonState {
  return {
    status: token.status,
    tokenCode: token.tokenCode,
    mealName: token.mealName,
    mealSlot: token.mealSlot,
    claimedAt: token.claimedAt,
    usedAt: token.consumedAt,
  };
}

export function useEzeton() {
  const { isAuthenticated, session } = useStudentSession();
  const usesApi = shouldUseEzetonApi() && isAuthenticated;
  const [records, setRecords] = useState<EzetonRecord[]>(getEzetonHydrationRecords);
  const [serverToken, setServerToken] = useState<EzetonTokenRecord | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (usesApi) {
      fetchMyTokenFromApi()
        .then((token) => {
          setServerToken(token);
          if (token) {
            setRecords([{
              tokenCode: token.tokenCode,
              studentName: "",
              zeton: mapServerTokenToUserState(token),
              history: [],
            }]);
          } else {
            setRecords([]);
          }
          setIsLoaded(true);
        })
        .catch(() => {
          setIsLoaded(true);
        });
    } else {
      setServerToken(null);
      setIsLoaded(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecords(loadEzetonRecords());
      return subscribeEzeton(() => {
        setRecords(loadEzetonRecords());
      });
    }
  }, [usesApi]);

  const refresh = useCallback(() => {
    if (usesApi) {
      setIsLoaded(false);
      fetchMyTokenFromApi()
        .then((token) => {
          setServerToken(token);
          if (token) {
            setRecords([{
              tokenCode: token.tokenCode,
              studentName: "",
              zeton: mapServerTokenToUserState(token),
              history: [],
            }]);
          } else {
            setRecords([]);
          }
          setIsLoaded(true);
        })
        .catch(() => {
          setIsLoaded(true);
        });
    } else {
      setRecords(loadEzetonRecords());
    }
  }, [usesApi]);

  const demoStudent = usesApi
    ? (serverToken
      ? {
          tokenCode: serverToken.tokenCode,
          studentName: "",
          zeton: mapServerTokenToUserState(serverToken),
          history: [],
        }
      : { tokenCode: "", studentName: "", zeton: { status: "none" as const, tokenCode: "", mealName: null, mealSlot: null, claimedAt: null, usedAt: null }, history: [] })
    : getDemoStudentZeton();

  return { records, demoStudent, refresh, serverToken, isLoaded };
}

export function useDemoStudentZeton() {
  const { demoStudent, refresh } = useEzeton();
  return { record: demoStudent, refresh };
}

export function useServerEzeton() {
  const { serverToken, isLoaded, refresh } = useEzeton();

  const userState: UserZetonState | null = serverToken
    ? mapServerTokenToUserState(serverToken)
    : null;

  return { token: serverToken, state: userState, isLoaded, refresh };
}
