import { isDishCatalogHydratedForKitchenUI } from "@/lib/dish-catalog-store";
import { isJelovnikHydratedForKitchenUI } from "@/lib/kuhinja-jelovnik-store";

export function isKitchenMenuDataReady() {
  return isJelovnikHydratedForKitchenUI() && isDishCatalogHydratedForKitchenUI();
}
