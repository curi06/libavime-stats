"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();

    setMensaje("");
    setCargando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setCargando(false);

    if (error) {
      setMensaje("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/admin");
  }

  async function recuperarContrasena() {
    if (!email) {
      setMensaje(
        "Escribe primero tu correo electrónico para enviarte el enlace de recuperación."
      );
      return;
    }

    setMensaje("");
    setCargando(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setCargando(false);

    if (error) {
      setMensaje(
        `Error al enviar el correo de recuperación: ${error.message}`
      );
      return;
    }

    setMensaje(
      "Te enviamos un correo con el enlace para restablecer tu contraseña. Revisa también la carpeta de spam."
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-black text-center text-blue-900 mb-6">
          🔐 Inicio de Sesión LIBAVIME
        </h1>

        <form onSubmit={iniciarSesion} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl p-3"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl p-3"
            required
          />

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-900 text-white p-3 rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50"
          >
            {cargando ? "Procesando..." : "Iniciar Sesión"}
          </button>
        </form>

        <button
          type="button"
          onClick={recuperarContrasena}
          disabled={cargando}
          className="w-full mt-4 text-blue-900 font-bold hover:underline disabled:opacity-50"
        >
          ¿Olvidaste tu contraseña?
        </button>

        {mensaje && (
          <p className="text-center mt-4 text-sm text-gray-700">
            {mensaje}
          </p>
        )}
      </div>
    </main>
  );
}