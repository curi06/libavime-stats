"use client";

/* eslint-disable @next/next/no-img-element -- vistas previas de archivos locales */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";
import type { ConfiguracionLiga } from "@/lib/liga";

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_IMAGEN = 5 * 1024 * 1024;

type Formulario = {
  nombre: string;
  nombre_corto: string;
  descripcion: string;
  ciudad: string;
  color_primario: string;
  color_secundario: string;
  temporada: string;
  inicio_temporada: string;
  inauguracion_fecha: string;
  inauguracion_lugar: string;
  campeon_equipo: string;
  campeon_temporada: string;
  instagram: string;
  youtube: string;
};

// "2026-09-18T18:00:00-04:00" → "2026-09-18T18:00" (hora de RD) para el campo.
const aCampoFechaHora = (iso?: string) => (iso ? iso.slice(0, 16) : "");

export default function ConfiguracionLigaPage() {
  const router = useRouter();
  const { liga, equipos, logo, ruta } = useLiga();
  const c = liga.configuracion;

  const [f, setF] = useState<Formulario>({
    nombre: liga.nombre,
    nombre_corto: liga.nombre_corto ?? "",
    descripcion: liga.descripcion ?? "",
    ciudad: liga.ciudad ?? "",
    color_primario: liga.color_primario,
    color_secundario: liga.color_secundario,
    temporada: c.temporada ?? String(new Date().getFullYear()),
    inicio_temporada: c.inicio_temporada ?? "",
    inauguracion_fecha: aCampoFechaHora(c.inauguracion?.fecha),
    inauguracion_lugar: c.inauguracion?.lugar ?? "",
    campeon_equipo: c.campeon_defensor?.equipo ?? "",
    campeon_temporada: c.campeon_defensor?.temporada ?? "",
    instagram: c.redes?.instagram ?? "",
    youtube: c.redes?.youtube ?? "",
  });
  const [logoNuevo, setLogoNuevo] = useState<File | null>(null);
  const [bannerNuevo, setBannerNuevo] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cambiar = (campo: keyof Formulario) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setF((actual) => ({ ...actual, [campo]: e.target.value }));

  async function subirImagen(archivo: File, tipo: "logo" | "banner") {
    if (!archivo.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen.");
    if (archivo.size > MAX_IMAGEN) throw new Error("La imagen debe pesar menos de 5 MB.");
    const extension = archivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const ruta = `${liga.id}/${tipo}-${Date.now()}.${extension}`;
    const { error: errorSubida } = await supabase.storage
      .from("Ligas")
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
    if (errorSubida) throw new Error(`No se pudo subir el ${tipo}: ${errorSubida.message}`);
    return supabase.storage.from("Ligas").getPublicUrl(ruta).data.publicUrl;
  }

  function validar(): string | null {
    if (f.nombre.trim().length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (f.nombre_corto.trim().length > 30) return "El nombre corto admite hasta 30 caracteres.";
    if (!HEX.test(f.color_primario) || !HEX.test(f.color_secundario)) return "Los colores no son válidos.";
    for (const url of [f.instagram, f.youtube]) {
      if (url.trim() && !/^https:\/\/[^\s]+$/.test(url.trim())) {
        return "Los enlaces de redes deben empezar con https://";
      }
    }
    if (Boolean(f.campeon_equipo.trim()) !== Boolean(f.campeon_temporada.trim())) {
      return "Para el campeón defensor indica el equipo y la temporada.";
    }
    return null;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("");
    setError("");
    const problema = validar();
    if (problema) return setError(problema);

    setGuardando(true);
    try {
      const logo_url = logoNuevo ? await subirImagen(logoNuevo, "logo") : liga.logo_url;
      const banner_url = bannerNuevo ? await subirImagen(bannerNuevo, "banner") : liga.banner_url;

      const configuracion: ConfiguracionLiga = {
        ...liga.configuracion,
        temporada: f.temporada.trim() || undefined,
        inicio_temporada: f.inicio_temporada || undefined,
        inauguracion: f.inauguracion_fecha
          ? { fecha: `${f.inauguracion_fecha}:00-04:00`, lugar: f.inauguracion_lugar.trim() || undefined }
          : undefined,
        campeon_defensor: f.campeon_equipo.trim()
          ? { equipo: f.campeon_equipo.trim(), temporada: f.campeon_temporada.trim() }
          : undefined,
        redes: {
          instagram: f.instagram.trim() || undefined,
          youtube: f.youtube.trim() || undefined,
        },
      };

      const { data: filas, error: errorGuardar } = await supabase
        .from("ligas")
        .update({
          nombre: f.nombre.trim(),
          nombre_corto: f.nombre_corto.trim() || null,
          descripcion: f.descripcion.trim() || null,
          ciudad: f.ciudad.trim() || null,
          color_primario: f.color_primario,
          color_secundario: f.color_secundario,
          logo_url,
          banner_url,
          configuracion: JSON.parse(JSON.stringify(configuracion)),
        })
        .eq("id", liga.id)
        .select("id");

      if (errorGuardar) throw new Error(errorGuardar.message);
      // Sin permiso, RLS no da error: simplemente no actualiza filas.
      if (!filas?.length) throw new Error("Solo los administradores de la liga pueden cambiar la configuración.");

      setLogoNuevo(null);
      setBannerNuevo(null);
      setMensaje("✅ Configuración guardada. Los cambios ya se ven en la página de la liga.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  }

  const campo = "mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 outline-none focus:border-blue-600";
  const etiqueta = "block text-sm font-bold text-slate-700";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black text-blue-950">⚙️ Configuración de la liga</h1>
      <p className="mt-1 text-slate-600">
        Así se presenta tu liga en{" "}
        <a href={ruta("/")} className="font-bold text-blue-700 underline" target="_blank" rel="noreferrer">
          su página pública
        </a>
        .
      </p>

      <form onSubmit={guardar} className="mt-6 space-y-6">
        <section className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-blue-950">Identidad</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className={etiqueta}>
              Nombre completo
              <input className={campo} value={f.nombre} onChange={cambiar("nombre")} maxLength={120} required />
            </label>
            <label className={etiqueta}>
              Nombre corto (siglas)
              <input className={campo} value={f.nombre_corto} onChange={cambiar("nombre_corto")} maxLength={30} />
            </label>
            <label className={etiqueta}>
              Ciudad
              <input className={campo} value={f.ciudad} onChange={cambiar("ciudad")} maxLength={80} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={etiqueta}>
                Color principal
                <input type="color" className="mt-1 h-12 w-full rounded-xl" value={f.color_primario} onChange={cambiar("color_primario")} />
              </label>
              <label className={etiqueta}>
                Color secundario
                <input type="color" className="mt-1 h-12 w-full rounded-xl" value={f.color_secundario} onChange={cambiar("color_secundario")} />
              </label>
            </div>
            <label className={`${etiqueta} md:col-span-2`}>
              Descripción
              <textarea className={campo} rows={3} value={f.descripcion} onChange={cambiar("descripcion")} maxLength={600} />
            </label>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-blue-950">Logo y banner</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <p className={etiqueta}>Logo (cuadrado, PNG recomendado)</p>
              <img
                src={logoNuevo ? URL.createObjectURL(logoNuevo) : logo}
                alt="Logo de la liga"
                className="mt-2 h-28 w-28 rounded-2xl bg-slate-100 object-contain p-2"
              />
              <input type="file" accept="image/*" className="mt-2 text-sm" onChange={(e) => setLogoNuevo(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <p className={etiqueta}>Banner de portada (horizontal, 1536 × 1024 aprox.)</p>
              {bannerNuevo || liga.banner_url ? (
                <img
                  src={bannerNuevo ? URL.createObjectURL(bannerNuevo) : liga.banner_url ?? ""}
                  alt="Banner de la liga"
                  className="mt-2 h-28 w-full rounded-2xl bg-slate-100 object-cover"
                />
              ) : (
                <p className="mt-2 rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
                  Sin banner: la portada usa tu logo y tus colores.
                </p>
              )}
              <input type="file" accept="image/*" className="mt-2 text-sm" onChange={(e) => setBannerNuevo(e.target.files?.[0] ?? null)} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-blue-950">Temporada</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className={etiqueta}>
              Temporada en curso
              <input className={campo} value={f.temporada} onChange={cambiar("temporada")} maxLength={20} placeholder="2026" />
            </label>
            <label className={etiqueta}>
              Inicio de la temporada
              <input type="date" className={campo} value={f.inicio_temporada} onChange={cambiar("inicio_temporada")} />
            </label>
            <label className={etiqueta}>
              Inauguración (opcional, muestra una cuenta regresiva)
              <input type="datetime-local" className={campo} value={f.inauguracion_fecha} onChange={cambiar("inauguracion_fecha")} />
            </label>
            <label className={etiqueta}>
              Lugar de la inauguración
              <input className={campo} value={f.inauguracion_lugar} onChange={cambiar("inauguracion_lugar")} maxLength={120} />
            </label>
            <label className={etiqueta}>
              Campeón defensor (opcional)
              <select className={campo} value={f.campeon_equipo} onChange={cambiar("campeon_equipo")}>
                <option value="">— Ninguno —</option>
                {equipos.map((e) => (
                  <option key={e.id} value={e.nombre}>{e.nombre}</option>
                ))}
                {f.campeon_equipo && !equipos.some((e) => e.nombre === f.campeon_equipo) && (
                  <option value={f.campeon_equipo}>{f.campeon_equipo}</option>
                )}
              </select>
            </label>
            <label className={etiqueta}>
              Temporada en que fue campeón
              <input className={campo} value={f.campeon_temporada} onChange={cambiar("campeon_temporada")} maxLength={20} placeholder="2025" />
            </label>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow">
          <h2 className="text-lg font-black text-blue-950">Redes sociales</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className={etiqueta}>
              Instagram
              <input className={campo} value={f.instagram} onChange={cambiar("instagram")} placeholder="https://www.instagram.com/tu-liga" />
            </label>
            <label className={etiqueta}>
              YouTube
              <input className={campo} value={f.youtube} onChange={cambiar("youtube")} placeholder="https://www.youtube.com/@tu-liga" />
            </label>
          </div>
        </section>

        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 font-bold text-red-700">{error}</p>}
        {mensaje && <p role="status" className="rounded-xl bg-green-50 p-3 font-bold text-green-800">{mensaje}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full rounded-xl bg-blue-950 px-6 py-4 font-black text-white shadow-lg hover:bg-blue-900 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar configuración"}
        </button>
      </form>
    </div>
  );
}
