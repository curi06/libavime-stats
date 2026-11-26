import Link from "next/link";
import { notFound } from "next/navigation";
import AdminSidebar from "@/app/components/AdminSidebar";
import { obtenerLiga } from "@/lib/liga-servidor";
import { crearSupabaseServidor } from "@/lib/supabase-server";
import { nombreCortoLiga, rutaLiga } from "@/lib/liga";

export const metadata = { title: "Administración", robots: { index: false } };

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ liga: string }>;
}) {
  const datos = await obtenerLiga((await params).liga);
  if (!datos) notFound();
  const { liga } = datos;

  // El proxy ya exige sesión; aquí se exige además ser miembro de ESTA liga.
  const supabase = await crearSupabaseServidor();
  const { data: rol } = await supabase.rpc("mi_rol_en_liga", { p_liga: liga.id });

  if (!rol) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <p className="text-5xl">🔒</p>
          <h1 className="mt-4 text-2xl font-black text-blue-950">Sin acceso</h1>
          <p className="mt-3 text-slate-600">
            Tu cuenta no pertenece al equipo de {nombreCortoLiga(liga)}. Si crees que es un
            error, pide a un administrador de la liga que te invite.
          </p>
          <Link
            href={rutaLiga(liga.slug)}
            className="mt-6 inline-block rounded-xl bg-blue-950 px-6 py-3 font-black text-white"
          >
            Ir a la página de la liga
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AdminSidebar esAdministrador={rol === "Administrador"} />

      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
