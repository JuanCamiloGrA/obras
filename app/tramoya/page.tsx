import { redirectIfAdmin } from "@/lib/auth";

import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  await redirectIfAdmin();

  return (
    <main className="adminLoginPage">
      <section className="loginCard stackMd">
        <div className="stackXs">
          <p className="eyebrow">Acceso interno</p>
          <h1>Panel de obras</h1>
          <p className="leadText smallLead">
            Carga guiones, actores, audios y define qué obra queda activa para la escuela.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
