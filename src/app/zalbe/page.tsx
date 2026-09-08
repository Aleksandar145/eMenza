import AppLayout from "@/components/layout/AppLayout";
import { ZalbeForm } from "@/components/zalbe/ZalbeForm";

export default function ZalbePage() {
  return (
    <AppLayout subtitle="Administracija će pregledati vašu žalbu u najkraćem roku" title="Žalbe">
      <ZalbeForm />
    </AppLayout>
  );
}
