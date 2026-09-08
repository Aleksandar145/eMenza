import { getDb } from "@/server/db"; 
import { mealReservations } from "@/server/db/schema"; 
import { and, eq } from "drizzle-orm";

export async function getKitchenStatsDb(dateKey: string, mealType: string) {
  const db = getDb();
  
  const allRows = await db
    .select()
    .from(mealReservations)
    .where(
      and(
        eq(mealReservations.dateKey, dateKey), 
        // 1. Dodajemo "as any" da zaobiđemo problem sa tipovima
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eq(mealReservations.mealType, mealType as any) 
      )
    );

  const ordered = allRows.length;
  
  // 2. Dodajemo "(row.status as string)" da bi TypeScript prestao da se buni
  const pickedUp = allRows.filter(row => (row.status as string) === "iskorisceno").length; 

  return {
    ordered: ordered,
    pickedUp: pickedUp,
    remaining: ordered - pickedUp,
  };
}