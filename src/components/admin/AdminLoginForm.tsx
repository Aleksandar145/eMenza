"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { StaffLoginPage } from "@/components/staff";
import { useAdminSession } from "@/hooks/useAdminSession";

export function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAdminSession();

  async function handleLogin(email: string, password: string) {
    const result = await login(email, password);
    if (!result) return false;

    if (result.mustChangePassword) {
      router.refresh();
      router.replace(`/promeni-lozinku?redirect=${encodeURIComponent("/admin")}`);
      return true;
    }

    router.refresh();
    router.push("/admin");
    return true;
  }

  return (
    <StaffLoginPage
      benefits={[
        "Upravljanje katalogom jela i cenama",
        "Objava obaveštenja za studente",
        "Monitoring naplate i zadovoljstva",
        "Podešavanja radnog vremena menze",
      ]}
      disableRedirect
      icon={Shield}
      onLogin={handleLogin}
      panelLabel="Administracija"
      redirectTo="/admin"
      submitIcon={Shield}
      subtitle="Centralna kontrola menze, jelovnika, obaveštenja i operativnih metrika."
      title="Prijava administratora"
    />
  );
}

export default AdminLoginForm;
