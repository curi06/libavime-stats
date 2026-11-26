import Link from "next/link";
import type { Metadata } from "next";
import { crearSupabaseServidor } from "@/lib/supabase-server";
import { logoLiga, nombreCortoLiga, rutaLiga, type Liga } from "@/lib/liga";

export const metadata: Metadata = { title: "Ligas · Quinteto Pro" };
export const dynamic = "force-dynamic";

/** Directorio público de ligas activas. */
export default async function LigasPage() {
  const supabase = await crearSupabaseServidor();
  const { data } = await supabase
    .from("ligas")
    .select("id, slug, nombre, nombre_corto, ciudad, logo_url, color_primario")
    .eq("estado", "activa")
    .order("nombre");
  const ligas = (data ?? []) as Pick<Liga, "id" | "slug" | "nombre" | "nombre_corto" | "ciudad" | "logo_url" | "color_primario">[];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="text-5xl">🏀</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Ligas en Quinteto Pro</h1>
          <p className="mt-2 text-slate-600">Estadísticas, calendario y resultados de cada liga.</p>
          <Link href="/quinteto" className="mt-3 inline-block font-bold text-orange-600 underline">
            ¿Qué es Quinteto Pro?
          </Link>
        </header>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ligas.map((liga) => (
            <Link
              key={liga.id}
              href={rutaLiga(liga.slug)}
              className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow transition hover:-translate-y-1 hover:shadow-xl"
              style={{ borderTop: `6px solid ${liga.color_primario}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- logos de origen variable */}
              <img src={logoLiga(liga)} alt="" className="h-16 w-16 shrink-0 object-contain" />
              <div>
                <p className="text-xl font-black text-slate-900">{nombreCortoLiga(liga)}</p>
                <p className="text-sm text-slate-500">{liga.ciudad ?? liga.nombre}</p>
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-12 text-center">
          <Link href="/registro" className="rounded-xl bg-orange-500 px-6 py-4 font-black text-white shadow-lg hover:bg-orange-600">
            ¿Organizas una liga? Súmala a Quinteto Pro
          </Link>
        </div>
      </div>
    </main>
  );
}
