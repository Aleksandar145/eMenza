import { redirect } from "next/navigation";

export default function RegisterPreferencesPage() {
  redirect("/register?korak=3");
}
