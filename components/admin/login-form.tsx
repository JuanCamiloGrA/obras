"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { loginAction } from "@/app/tramoya/actions";
import { ADMIN_PANEL_PATH } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError("");

    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.ok) {
        setError(result.error || "No se pudo iniciar sesión.");
        return;
      }

      router.push(ADMIN_PANEL_PATH);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="adminLoginForm">
      <label className="field">
        <span>Usuario</span>
        <input name="username" autoComplete="username" defaultValue="admin" required />
      </label>

      <label className="field">
        <span>Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="12345678"
          required
        />
      </label>

      {error ? <p className="feedback error">{error}</p> : null}

      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar al panel"}
      </button>
    </form>
  );
}
