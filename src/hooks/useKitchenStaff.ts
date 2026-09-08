"use client";

import { useCallback, useEffect, useState } from "react";
import type { KitchenEmployee } from "@/lib/kuhinja-staff-store";
import {
  getKitchenEmployees,
  hydrateKitchenStaffFromStorage,
  loadKitchenStaffState,
  subscribeKitchenStaff,
} from "@/lib/kuhinja-staff-store";

export function useKitchenStaff() {
  const [employees, setEmployees] = useState<KitchenEmployee[]>(() => getKitchenEmployees());

  useEffect(() => {
    hydrateKitchenStaffFromStorage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmployees(loadKitchenStaffState().employees.filter((employee) => employee.active));

    return subscribeKitchenStaff(() => {
      setEmployees(loadKitchenStaffState().employees.filter((employee) => employee.active));
    });
  }, []);

  const refresh = useCallback(() => {
    setEmployees(loadKitchenStaffState().employees.filter((employee) => employee.active));
  }, []);

  return { employees, refresh };
}
