"use client";

import { getWorkingHours } from "@/lib/admin-system-store";

type WorkingHoursTableProps = {
  className?: string;
  compact?: boolean;
};

export function WorkingHoursTable({
  className = "",
  compact = false,
}: WorkingHoursTableProps) {
  const workingHours = getWorkingHours();

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[280px] text-left">
        <thead>
          <tr className="text-black/55">
            <th
              className={`pb-3 pr-6 font-semibold ${compact ? "text-sm lg:text-base" : "text-base lg:text-lg"}`}
              scope="col"
            >
              Obrok
            </th>
            <th
              className={`pb-3 pr-6 font-semibold ${compact ? "text-sm lg:text-base" : "text-base lg:text-lg"}`}
              scope="col"
            >
              Pon – Pet
            </th>
            <th
              className={`pb-3 font-semibold ${compact ? "text-sm lg:text-base" : "text-base lg:text-lg"}`}
              scope="col"
            >
              Sub – Ned
            </th>
          </tr>
        </thead>
        <tbody>
          {workingHours.map((row, index) => (
            <tr
              className={`text-black ${index > 0 ? "border-t border-black/5" : ""}`}
              key={row.meal}
            >
              <td
                className={`pr-6 font-medium text-black/75 ${compact ? "py-2.5 text-sm lg:text-base" : "py-3 text-base lg:text-lg"}`}
              >
                {row.meal}
              </td>
              <td
                className={`pr-6 font-semibold tabular-nums ${compact ? "py-2.5 text-sm lg:text-base" : "py-3 text-base lg:text-lg"}`}
              >
                {row.weekday}
              </td>
              <td
                className={`font-semibold tabular-nums ${compact ? "py-2.5 text-sm lg:text-base" : "py-3 text-base lg:text-lg"}`}
              >
                {row.weekend}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default WorkingHoursTable;
