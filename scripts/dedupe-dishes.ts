import "./load-env";
import { closeDb } from "../src/server/db";
import { dedupeDishesDb } from "../src/server/repositories/dish-dedupe";

async function main() {
  console.log("eMenza — uklanjanje duplikata jela iz baze\n");

  const result = await dedupeDishesDb();

  console.log(`Grupa duplikata: ${result.duplicateGroups}`);
  console.log(`Obrisana jela: ${result.dishesRemoved}`);
  console.log(`Ažurirane stavke jelovnika: ${result.menuRowsUpdated}`);
  console.log(`Uklonjene duplirane stavke jelovnika: ${result.menuRowsRemoved}`);
  console.log(`Jela u bazi posle čišćenja: ${result.dishesRemaining}`);
  console.log("\nDedupe završen.\n");

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
