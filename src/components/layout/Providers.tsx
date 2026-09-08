"use client";

import { Suspense, type ReactNode } from "react";
import { AppTimeProvider } from "@/contexts/AppTimeProvider";
import { MealReservationsProvider } from "@/contexts/MealReservationsProvider";
import { MenuDataPrefetchProvider } from "@/contexts/MenuDataPrefetchProvider";
import { StudentNotificationsProvider } from "@/contexts/StudentNotificationsProvider";
import { StudentSessionProvider } from "@/contexts/StudentSessionProvider";
import { StudentCardProvider } from "@/contexts/StudentCardProvider";
import { UserSettingsProvider } from "@/contexts/UserSettingsProvider";
import { CardAccessProvider } from "@/components/shared/CardAccessProvider";
import { AppPreferencesRuntime } from "@/components/shared/AppPreferencesRuntime";
import { StudentAccessGate } from "@/components/layout/StudentAccessGate";
import { ToastProvider } from "@/components/shared/toast/ToastProvider";
import { I18nProvider } from "@/i18n/I18nProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppTimeProvider>
      <StudentSessionProvider>
        <Suspense fallback={null}>
          <StudentAccessGate>
            <MealReservationsProvider>
              <MenuDataPrefetchProvider>
                <StudentNotificationsProvider>
                <UserSettingsProvider>
                  <I18nProvider>
                    <AppPreferencesRuntime />
                    <StudentCardProvider>
                      <CardAccessProvider>{children}</CardAccessProvider>
                    </StudentCardProvider>
                  </I18nProvider>
                </UserSettingsProvider>
                </StudentNotificationsProvider>
              </MenuDataPrefetchProvider>
            </MealReservationsProvider>
          </StudentAccessGate>
        </Suspense>
      </StudentSessionProvider>
      </AppTimeProvider>
    </ToastProvider>
  );
}

export default Providers;
