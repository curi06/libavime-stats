"use client";

import { useState } from "react";

/**
 * Muestra un enlace de invitación para compartir a mano (cuando el correo
 * no se pudo enviar): copiar o mandar por WhatsApp con un mensaje listo.
 */
export default function EnlaceInvitacion({
  enlace,
  nombre,
  liga,
  telefono,
}: {
  enlace: string;
  nombre: string;
  liga: string;
  telefono?: string | null;
}) {
  const [copiado, setCopiado] = useState(false);
  const mensaje = `Hola ${nombre}, te invito a administrar ${liga} en Quinteto Pro 🏀. Entra a este enlace para crear tu contraseña: ${enlace}`;
  const numero = (telefono ?? "").replace(/\D/g, "");
  const whatsapp = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copia el enlace de invitación:", enlace);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
      <p className="font-black text-amber-900">📨 No se pudo enviar el correo de invitación</p>
      <p className="mt-1 text-sm text-amber-900">
        Comparte este enlace con <strong>{nombre}</strong> para que cree su contraseña. Es personal:
        no lo publiques.
      </p>
      <input readOnly value={enlace} className="mt-3 w-full rounded-xl border border-amber-300 bg-white p-2 text-xs" onFocus={(e) => e.target.select()} />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void copiar()} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white">
          {copiado ? "✅ Copiado" : "Copiar enlace"}
        </button>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-green-600 px-4 py-2 font-bold text-white">
          Enviar por WhatsApp
        </a>
      </div>
    </div>
  );
}
