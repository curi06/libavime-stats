import { equipos } from "../../../data/equipos";
import { partidos } from "../../../data/partidos";
import { jugadores } from "../../../data/jugadores";
import Link from "next/link";
import Image from "next/image";

export default async function EquipoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const equipo = equipos.find(
  (e) => e.slug === slug
);

if (!equipo) {
  return <h1>Equipo no encontrado</h1>;
}

const jugadoresEquipo = jugadores.filter(
  (jugador) => jugador.equipo === equipo.nombre
);
const liderAnotador = [...jugadoresEquipo].sort(
  (a, b) => b.ppg - a.ppg
)[0];

const proximosPartidos = partidos.filter(
  (partido) =>
    partido.local === equipo.nombre ||
    partido.visitante === equipo.nombre
);
const totalPPG = jugadoresEquipo.reduce(
  (total, jugador) => total + jugador.ppg,
  0
);

const promedioPPG =
  jugadoresEquipo.length === 0
    ? 0
    : (totalPPG / jugadoresEquipo.length).toFixed(1);

const maximoAnotador = jugadoresEquipo.reduce(
  (mejor, jugador) =>
    jugador.ppg > mejor.ppg ? jugador : mejor,
  jugadoresEquipo[0]
);
  let ganados = 0;
  let perdidos = 0;

  partidos.forEach((partido) => {
    if (
      partido.puntosLocal === 0 &&
      partido.puntosVisitante === 0
    ) {
      return;
    }

    if (
      partido.local === equipo.nombre &&
      partido.puntosLocal > partido.puntosVisitante
    ) {
      ganados++;
    }

    if (
      partido.visitante === equipo.nombre &&
      partido.puntosVisitante > partido.puntosLocal
    ) {
      ganados++;
    }

    if (
      partido.local === equipo.nombre &&
      partido.puntosLocal < partido.puntosVisitante
    ) {
      perdidos++;
    }

    if (
      partido.visitante === equipo.nombre &&
      partido.puntosVisitante < partido.puntosLocal
    ) {
      perdidos++;
    }
  });

  const jj = ganados + perdidos;

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-2xl text-center">

        <Image
          src={equipo.logo}
          alt={equipo.nombre}
          width={220}
          height={220}
          className="mx-auto"
        />

        <h1 className="text-4xl font-black mt-6">
          {equipo.nombre}
        </h1>

        <p className="mt-4 text-xl">
          Récord: {ganados}-{perdidos}
        </p>

        <p>JJ: {jj}</p>

        <p>
          PCT: {jj === 0 ? ".000" : (ganados / jj).toFixed(3)}
        </p>
        <div className="mt-8 bg-yellow-100 rounded-2xl p-6">
  <h2 className="text-2xl font-bold mb-4">
    🏆 Jugador Franquicia
  </h2>

  <Link
  href={`/jugadores/${liderAnotador.slug}`}
  className="text-xl font-bold text-blue-700 hover:underline"
>
  {liderAnotador.nombre}
</Link>

  <p>
    {liderAnotador.ppg} PPG
  </p>
</div>
        
<h2 className="text-2xl font-bold mt-8 mb-4">
  📅 Próximos Partidos
</h2>

<div className="space-y-3">
  {proximosPartidos.map((partido, index) => (
    <div
      key={index}
      className="border rounded-xl p-4"
    >
      <p className="font-bold">
        {partido.local} vs {partido.visitante}
      </p>

      <p className="text-gray-600">
        {partido.fecha}
      </p>
    </div>
    
  ))}
</div>
<h2 className="text-2xl font-bold mt-8 mb-4">
  👥 Jugadores
</h2>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {jugadoresEquipo.map((jugador) => (
    <Link
      key={jugador.nombre}
      href={`/jugadores/${jugador.slug}`}
      className="border rounded-xl p-4 hover:bg-slate-100 transition"
    >
      <div className="flex items-center gap-3">
        <Image
          src={jugador.foto}
          alt={jugador.nombre}
          width={60}
          height={60}
          className="rounded-full"
        />

        <div>
          <p className="font-bold">
            {jugador.nombre}
          </p>

          <p className="text-sm text-gray-600">
            #{jugador.numero} • {jugador.posicion}
          </p>
        </div>
      </div>
    </Link>
  ))}
</div>
<h2 className="text-2xl font-bold mt-8 mb-4">
  📊 Estadísticas del Equipo
</h2>

<div className="grid grid-cols-2 gap-4">

  <div className="bg-blue-100 rounded-xl p-4">
    <p className="text-sm">Jugadores</p>
    <p className="text-3xl font-bold">
      {jugadoresEquipo.length}
    </p>
  </div>

  <div className="bg-green-100 rounded-xl p-4">
    <p className="text-sm">PPG Total</p>
    <p className="text-3xl font-bold">
      {totalPPG}
    </p>
  </div>

  <div className="bg-yellow-100 rounded-xl p-4">
    <p className="text-sm">PPG Promedio</p>
    <p className="text-3xl font-bold">
      {promedioPPG}
    </p>
  </div>

  <div className="bg-red-100 rounded-xl p-4">
    <p className="text-sm">Máximo Anotador</p>
    <p className="font-bold">
      {maximoAnotador?.nombre}
    </p>
    <p>
      {maximoAnotador?.ppg} PPG
    </p>
  </div>

</div>

      </div>
    </main>
  );
}