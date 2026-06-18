"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMensaje("Correo o contraseña incorrectos");
      return;
    }

    router.push("/admin");
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
            className="w-full bg-blue-900 text-white p-3 rounded-xl font-bold hover:bg-blue-800"
          >
            Iniciar Sesión
          </button>

        </form>

        {mensaje && (
          <p className="text-red-600 text-center mt-4">
            {mensaje}
          </p>
        )}

      </div>

    </main>
  );
}