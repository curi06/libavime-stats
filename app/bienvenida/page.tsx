"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Página a la que llega una persona invitada desde el correo de Supabase.
// Acepta los tres formatos de enlace (código, token_hash o tokens en el
// fragmento #) y le pide crear su contraseña.
export default function BienvenidaPage() {
  const [estado, setEstado] = useState<"verificando" | "listo" | "error" | "hecho">("verificando");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState("");
  const [liga, setLiga] = useState("");

  useEffect(() => {
    async function abrirSesion() {
      const url = new URL(window.location.href);
      setLiga((url.searchParams.get("liga") ?? "").replace(/[^a-z0-9-]/g, ""));
      const fragmento = new URLSearchParams(url.hash.replace(/^#/, ""));

      try {
        if (url.searchParams.get("code")) {
          const { error } = await supabase.auth.exchangeCodeForSession(url.searchParams.get("code")!);
          if (error) throw error;
        } else if (url.searchParams.get("token_hash")) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: url.searchParams.get("token_hash")!,
            type: "invite",
          });
          if (error) throw error;
        } else if (fragmento.get("access_token") && fragmento.get("refresh_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: fragmento.get("access_token")!,
            refresh_token: fragmento.get("refresh_token")!,
          });
          if (error) throw error;
          window.history.replaceState(null, "", url.pathname + url.search);
        }

        const { data } = await supabase.auth.getUser();
        if (!data.user) throw new Error("sin sesión");
        setCorreo(data.user.email ?? "");
        setEstado("listo");
      } catch {
        setEstado("error");
      }
    }
    void abrirSesion();
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (contrasena.length < 10) return setError("La contraseña debe tener al menos 10 caracteres.");
    if (contrasena !== confirmacion) return setError("Las contraseñas no coinciden.");
    const { error } = await supabase.auth.updateUser({ password: contrasena });
    if (error) return setError(error.message);
    setEstado("hecho");
  }

  const destino = liga ? `/${liga}/admin` : "/login";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="text-center text-5xl">🏀</p>
        <h1 className="mt-3 text-center text-2xl font-black text-blue-950">Bienvenido a Quinteto Pro</h1>

        {estado === "verificando" && <p className="mt-6 text-center text-slate-600">Verificando tu invitación…</p>}

        {estado === "error" && (
          <div className="mt-6 text-center text-slate-600">
            <p>El enlace de invitación no es válido o ya venció.</p>
            <p className="mt-2">Pide al administrador de tu liga que te invite de nuevo.</p>
          </div>
        )}

        {estado === "listo" && (
          <form onSubmit={guardar} className="mt-6 space-y-4">
            <p className="text-center text-slate-600">
              Crea una contraseña para <strong>{correo}</strong>.
            </p>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Contraseña (mínimo 10 caracteres)"
              className="w-full rounded-xl border border-slate-300 p-3"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              className="w-full rounded-xl border border-slate-300 p-3"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
            <button className="w-full rounded-xl bg-blue-950 py-3 font-black text-white">Guardar contraseña</button>
          </form>
        )}

        {estado === "hecho" && (
          <div className="mt-6 text-center">
            <p className="font-bold text-green-700">✅ ¡Listo! Tu cuenta está activa.</p>
            <a href={destino} className="mt-4 inline-block rounded-xl bg-blue-950 px-6 py-3 font-black text-white">
              Entrar al panel de tu liga
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
