"use client";

import { useCallback, useEffect, useState } from "react";
import { StaffSegmentedControl } from "@/components/staff";
import { apiGet } from "@/lib/api/client";
import {
  PrometTab,
  JelaTab,
  RezervacijeTab,
  PopularnostTab,
  KorisniciTab,
  MagacinTab,
  addDays,
  todayStr,
  periodLengths,
} from "./monitoring-tabs";
import type { MonitoringResponse, Granularity } from "./monitoring-tabs";

type ActiveTab = "promet" | "jela" | "rezervacije" | "popularnost" | "korisnici" | "magacin";

const tabOptions = [
  { id: "promet" as const, label: "Promet" },
  { id: "jela" as const, label: "Jela" },
  { id: "rezervacije" as const, label: "Rezervacije" },
  { id: "popularnost" as const, label: "Popularnost" },
  { id: "korisnici" as const, label: "Korisnici" },
  { id: "magacin" as const, label: "Magacin" },
];

export function AdminMonitoringPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("promet");
  const [granularity, setGranularity] = useState<Granularity>("nedelja");
  const [startDate1, setStartDate1] = useState(addDays(todayStr(), -6));
  const [startDate2, setStartDate2] = useState(addDays(todayStr(), -13));
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [data, setData] = useState<MonitoringResponse | null>(null);

  const isSingleDay = granularity === "dan";

  const length = periodLengths[granularity];
  const from1 = startDate1;
  const to1 = addDays(startDate1, length - 1);
  const from2 = startDate2;
  const to2 = addDays(startDate2, length - 1);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ from: from1, to: to1 });
      if (compareEnabled) {
        params.append("from2", from2);
        params.append("to2", to2);
      }
      const result = await apiGet<MonitoringResponse>(`/api/admin/monitoring?${params}`);
      setData(result);
    } catch {
    }
  }, [from1, to1, from2, to2, compareEnabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      <StaffSegmentedControl options={tabOptions} value={activeTab} onChange={setActiveTab} />

      {activeTab === "promet" ? (
        !data ? (
          <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
        ) : (
          <PrometTab
            data={data}
            granularity={granularity}
            setGranularity={setGranularity}
            startDate1={startDate1}
            setStartDate1={setStartDate1}
            startDate2={startDate2}
            from1={from1}
            to1={to1}
            from2={from2}
            to2={to2}
            compareEnabled={compareEnabled}
            setCompareEnabled={setCompareEnabled}
            isSingleDay={isSingleDay}
          />
        )
      ) : activeTab === "jela" ? (
        <JelaTab />
      ) : activeTab === "rezervacije" ? (
        !data ? (
          <p className="text-sm text-[var(--text-secondary)]">Učitavanje...</p>
        ) : (
          <RezervacijeTab
            data={data}
            granularity={granularity}
            setGranularity={setGranularity}
            startDate1={startDate1}
            from1={from1}
            to1={to1}
            from2={from2}
            to2={to2}
            compareEnabled={compareEnabled}
          />
        )
      ) : activeTab === "popularnost" ? (
        <PopularnostTab />
      ) : activeTab === "magacin" ? (
        <MagacinTab />
      ) : (
        <KorisniciTab />
      )}
    </div>
  );
}

export default AdminMonitoringPage;
