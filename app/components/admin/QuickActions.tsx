import Link from "next/link";

export default function QuickActions() {
  const acciones = [
    {
      href: "/admin/jugadores",
      icono: "👤",
      titulo: "Jugadores",
      descripcion: "Crear, editar y eliminar jugadores.",
    },
    {
      href: "/admin/equipos",
      icono: "🏀",
      titulo: "Equipos",
      descripcion: "Administrar equipos y logos.",
    },
    {
      href: "/admin/partidos",
      icono: "📅",
      titulo: "Partidos",
      descripcion: "Crear calendario y resultados.",
    },
    {
      href: "/admin/encuadres",
      icono: "🎨",
      titulo: "Editor de encuadres",
      descripcion: "Crear y administrar encuadres para diseños de LIBAVIME.",
    },
    {
      href: "/admin/instagram",
      icono: "📱",
      titulo: "Editor de Instagram",
      descripcion: "Crear publicaciones e historias y publicarlas en la galería.",
    },
  ];

  return (
    <>
      <h2 className="text-3xl font-bold mt-12 mb-6">
        Administración
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {acciones.map((accion) => (
          <Link
            key={accion.href}
            href={accion.href}
            className="bg-white rounded-2xl shadow-lg p-8 text-center hover:scale-105 hover:shadow-xl transition"
          >
            <h3 className="text-2xl md:text-3xl font-black mb-3 text-blue-950">
              {accion.icono} {accion.titulo}
            </h3>

            <p className="text-gray-600">
              {accion.descripcion}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
