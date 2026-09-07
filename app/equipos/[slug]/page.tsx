import { supabase } from "@/lib/supabase";
import Navbar from "../../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { equipos } from "../../../data/equipos";

type Jugador = {
  id: number;
  nombre: string;
  slug: string;
  numero: number | null;
  posicion: string | null;
  equipo: string | null;
  foto: string | null;
  ppg: number;
  rpg: number;
  apg: number;
  partidos_jugados: number;
};

type Equipo = {
  nombre: string;
  slug: string;
  logo: string;
};

const ESTILOS: Record<
  string,
  {
    fondo: string;
    fondoClaro: string;
    texto: string;
    acento: string;
    borde: string;
  }
> = {
  /* 🟢 GLADIADORES */
  Gladiadores: {
    fondo:
      "from-green-600 via-green-700 to-green-950",
    fondoClaro: "#DCFCE7",
    texto: "#FFFFFF",
    acento: "#166534",
    borde: "#22C55E",
  },

  /* 🟣 VIKINGOS */
  Vikingos: {
    fondo:
      "from-purple-600 via-purple-700 to-purple-950",
    fondoClaro: "#F3E8FF",
    texto: "#FFFFFF",
    acento: "#7E22CE",
    borde: "#A855F7",
  },

  /* 🔴 TITANES */
  Titanes: {
    fondo:
      "from-red-600 via-red-700 to-red-950",
    fondoClaro: "#FEE2E2",
    texto: "#FFFFFF",
    acento: "#B91C1C",
    borde: "#EF4444",
  },

  /* 🟡 ESPARTANOS */
  Espartanos: {
    fondo:
      "from-yellow-400 via-yellow-500 to-amber-600",
    fondoClaro: "#FEF3C7",
    texto: "#111827",
    acento: "#A16207",
    borde: "#EAB308",
  },
};

function normalizarEquipo(
  valor: string | null | undefined
) {
  return String(valor ?? "")
    .trim()
    .toLowerCase();
}

function obtenerEstilo(nombreEquipo: string) {
  return (
    ESTILOS[nombreEquipo] ??
    ESTILOS.Espartanos
  );
}

function obtenerFoto(
  foto: string | null | undefined
) {
  if (
    foto &&
    (foto.startsWith("/") ||
      foto.startsWith("http://") ||
      foto.startsWith("https://"))
  ) {
    return foto;
  }

  return "/logos/LIBAVIME.png";
}

export default async function EquipoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const equipoData = (
    equipos as Equipo[]
  ).find((equipo) => equipo.slug === slug);

  if (!equipoData) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-28 px-4">
          <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-10 text-center">
            <h1 className="text-3xl font-black text-blue-950">
              Equipo no encontrado
            </h1>

            <p className="text-gray-600 mt-3">
              No pudimos encontrar el equipo solicitado.
            </p>

            <Link
              href="/equipos"
              className="inline-block mt-7 bg-blue-950 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition"
            >
              ← Volver a equipos
            </Link>
          </div>
        </main>
      </>
    );
  }

  const nombreEquipo = equipoData.nombre;

  const estilo = obtenerEstilo(nombreEquipo);

  /* =========================================
     JUGADORES
  ========================================== */

  const {
    data: jugadoresData,
    error: jugadoresError,
  } = await supabase
    .from("jugadores")
    .select(
      "id, nombre, slug, numero, posicion, equipo, foto"
    )
    .ilike("equipo", nombreEquipo);

  /* =========================================
     ESTADÍSTICAS
  ========================================== */

  const {
    data: estadisticasData,
    error: estadisticasError,
  } = await supabase
    .from("estadisticas_jugadores")
    .select(
      "jugador_id, ppg, rpg, apg, partidos_jugados"
    );

  /* =========================================
     PARTIDOS
  ========================================== */

  const {
    data: partidosData,
    error: partidosError,
  } = await supabase
    .from("partidos")
    .select(
      "id, equipo_local, equipo_visitante, puntos_local, puntos_visitante, estado"
    )
    .eq("estado", "Finalizado");

  if (jugadoresError) {
    console.error(
      "Error cargando jugadores:",
      jugadoresError
    );
  }

  if (estadisticasError) {
    console.error(
      "Error cargando estadísticas:",
      estadisticasError
    );
  }

  if (partidosError) {
    console.error(
      "Error cargando partidos:",
      partidosError
    );
  }

  /* =========================================
     MAPA DE ESTADÍSTICAS
  ========================================== */

  const estadisticasPorJugador =
    new Map<string, any>(
      (estadisticasData ?? []).map(
        (estadistica: any) => [
          String(estadistica.jugador_id),
          estadistica,
        ]
      )
    );

  /* =========================================
     CONSTRUIR JUGADORES
  ========================================== */

  const jugadores: Jugador[] = (
    jugadoresData ?? []
  )
    .map((jugador: any) => {
      const estadistica =
        estadisticasPorJugador.get(
          String(jugador.id)
        );

      return {
        id: jugador.id,
        nombre: jugador.nombre,
        slug: jugador.slug,
        numero:
          jugador.numero === null ||
          jugador.numero === undefined
            ? null
            : Number(jugador.numero),
        posicion: jugador.posicion ?? null,
        equipo:
          jugador.equipo ?? nombreEquipo,
        foto: jugador.foto ?? null,
        ppg: Number(estadistica?.ppg) || 0,
        rpg: Number(estadistica?.rpg) || 0,
        apg: Number(estadistica?.apg) || 0,
        partidos_jugados:
          Number(
            estadistica?.partidos_jugados
          ) || 0,
      };
    })
    .sort((a, b) => {
      const numeroA =
        a.numero === null ? 999 : a.numero;

      const numeroB =
        b.numero === null ? 999 : b.numero;

      if (numeroA !== numeroB) {
        return numeroA - numeroB;
      }

      return a.nombre.localeCompare(b.nombre);
    });

  /* =========================================
     RÉCORD DEL EQUIPO
  ========================================== */

  let ganados = 0;
  let perdidos = 0;

  const nombreEquipoNormalizado =
    normalizarEquipo(nombreEquipo);

  (partidosData ?? []).forEach(
    (partido: any) => {
      const local = normalizarEquipo(
        partido.equipo_local ??
          partido.local
      );

      const visitante = normalizarEquipo(
        partido.equipo_visitante ??
          partido.visitante
      );

      const puntosLocal = Number(
        partido.puntos_local ??
          partido.puntosLocal ??
          0
      );

      const puntosVisitante = Number(
        partido.puntos_visitante ??
          partido.puntosVisitante ??
          0
      );

      if (!local || !visitante) {
        return;
      }

      if (
        puntosLocal === 0 &&
        puntosVisitante === 0
      ) {
        return;
      }

      if (local === nombreEquipoNormalizado) {
        if (puntosLocal > puntosVisitante) {
          ganados++;
        } else if (
          puntosLocal < puntosVisitante
        ) {
          perdidos++;
        }
      }

      if (
        visitante === nombreEquipoNormalizado
      ) {
        if (
          puntosVisitante > puntosLocal
        ) {
          ganados++;
        } else if (
          puntosVisitante < puntosLocal
        ) {
          perdidos++;
        }
      }
    }
  );

  const jj = ganados + perdidos;

  const logoEquipo = equipoData.logo;

  return (
    <>
      <Navbar />

      <main
        className="
          min-h-screen
          bg-slate-100
          pt-20
          md:pt-24
        "
      >
        {/* =====================================
            ENCABEZADO DEL EQUIPO
        ====================================== */}

        <section
          className={`
            relative
            overflow-hidden
            bg-gradient-to-r
            ${estilo.fondo}
            ${estilo.texto === "#111827"
              ? "text-slate-900"
              : "text-white"}
          `}
        >
          {/* MARCA DE AGUA */}

          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={logoEquipo}
              alt=""
              width={500}
              height={500}
              className="
                absolute
                right-[-80px]
                top-[-100px]
                w-[420px]
                h-[420px]
                object-contain
                opacity-10
              "
            />
          </div>

          {/* CONTENIDO DEL HEADER */}

          <div
            className="
              relative
              max-w-7xl
              mx-auto
              px-5
              md:px-8
              pt-12
              pb-14
              md:pt-16
              md:pb-18
            "
          >
            <div
              className="
                flex
                flex-col
                md:flex-row
                items-center
                gap-8
                md:gap-10
              "
            >
              {/* LOGO */}

              <div className="flex-shrink-0">
                <div
                  className="
                    w-40
                    h-40
                    md:w-52
                    md:h-52
                    flex
                    items-center
                    justify-center
                  "
                >
                  <Image
                    src={logoEquipo}
                    alt={`Logo ${nombreEquipo}`}
                    width={240}
                    height={240}
                    className="
                      max-w-full
                      max-h-full
                      w-auto
                      h-auto
                      object-contain
                      drop-shadow-2xl
                    "
                  />
                </div>
              </div>

              {/* NOMBRE DEL EQUIPO */}

              <div className="flex-1 text-center md:text-left">
                <p className="text-sm md:text-base font-black tracking-[0.3em] uppercase opacity-90">
                  LIBAVIME 2026
                </p>

                <h1 className="text-5xl md:text-7xl font-black uppercase leading-none mt-3 drop-shadow-lg">
                  {nombreEquipo}
                </h1>

                <p className="text-lg md:text-2xl font-bold tracking-[0.18em] mt-5 uppercase">
                  Plantilla de jugadores
                </p>
              </div>

              {/* JJ / G / P */}

              <div
                className="
                  w-full
                  md:w-[340px]
                  bg-black/30
                  backdrop-blur-md
                  border
                  border-white/30
                  rounded-3xl
                  p-6
                  md:p-7
                "
              >
                <div
                  className="
                    grid
                    grid-cols-3
                    divide-x
                    divide-white/30
                    text-center
                  "
                >
                  <div>
                    <p className="text-sm font-bold opacity-80">
                      JJ
                    </p>

                    <p className="text-3xl md:text-4xl font-black mt-1">
                      {jj}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold opacity-80">
                      G
                    </p>

                    <p className="text-3xl md:text-4xl font-black mt-1">
                      {ganados}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-bold opacity-80">
                      P
                    </p>

                    <p className="text-3xl md:text-4xl font-black mt-1">
                      {perdidos}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================
            BARRA SECUNDARIA
        ====================================== */}

        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-center gap-2 md:gap-10 py-3 overflow-x-auto">
              <div className="flex items-center gap-2 bg-blue-950 text-white rounded-xl px-5 py-3 font-bold whitespace-nowrap">
                🏀
                <span>Plantilla</span>
              </div>

              <Link
                href="/estadisticas"
                className="flex items-center gap-2 px-4 py-3 font-semibold text-slate-700 hover:text-blue-900 whitespace-nowrap transition"
              >
                📊
                <span>Estadísticas</span>
              </Link>

              <Link
                href="/calendario"
                className="flex items-center gap-2 px-4 py-3 font-semibold text-slate-700 hover:text-blue-900 whitespace-nowrap transition"
              >
                📅
                <span>Partidos</span>
              </Link>

              <Link
                href="/resultados"
                className="flex items-center gap-2 px-4 py-3 font-semibold text-slate-700 hover:text-blue-900 whitespace-nowrap transition"
              >
                🏆
                <span>Resultados</span>
              </Link>

              <Link
                href="/jugadores"
                className="flex items-center gap-2 px-4 py-3 font-semibold text-slate-700 hover:text-blue-900 whitespace-nowrap transition"
              >
                👤
                <span>Jugadores</span>
              </Link>
            </div>
          </div>
        </div>

        {/* =====================================
            CONTENIDO
        ====================================== */}

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-blue-950">
                Jugadores ({jugadores.length})
              </h2>

              <p className="text-gray-500 mt-1">
                Plantilla oficial de{" "}
                {nombreEquipo}
              </p>
            </div>

            <div className="bg-white border border-slate-300 rounded-xl px-5 py-3 text-sm font-bold text-slate-700">
              Temporada 2026
            </div>
          </div>

          {/* =====================================
              PLANTILLA
              4 + 4 + 3
          ====================================== */}

          {jugadores.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
              {jugadores.map((jugador) => {
                const foto = obtenerFoto(
                  jugador.foto
                );

                return (
                  <Link
                    key={jugador.id}
                    href={`/jugadores/${jugador.slug}`}
                    className="group block"
                  >
                    <article
                      className="
                        relative
                        overflow-hidden
                        rounded-2xl
                        shadow-lg
                        hover:shadow-2xl
                        transition-all
                        duration-300
                        hover:-translate-y-1
                        border
                      "
                      style={{
                        borderColor:
                          estilo.borde,
                        backgroundColor:
                          estilo.fondoClaro,
                      }}
                    >
                      {/* MARCA DE AGUA */}

                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <Image
                          src={logoEquipo}
                          alt=""
                          width={350}
                          height={350}
                          className="
                            absolute
                            right-[-70px]
                            top-[40px]
                            w-[300px]
                            h-[300px]
                            object-contain
                            opacity-[0.10]
                          "
                        />
                      </div>

                      {/* NÚMERO */}

                      <div className="absolute top-3 left-3 z-20 bg-black text-white rounded-xl min-w-[48px] h-[48px] px-2 flex items-center justify-center shadow-lg">
                        <span className="text-xl font-black">
                          {jugador.numero ??
                            "-"}
                        </span>
                      </div>

                      {/* FOTO */}

                      <div className="relative h-[315px] md:h-[335px] overflow-hidden">
                        <Image
                          src={foto}
                          alt={jugador.nombre}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                          className="
                            object-cover
                            object-top
                            scale-[1.08]
                            transition-transform
                            duration-500
                            group-hover:scale-[1.14]
                          "
                        />

                        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>

                      {/* INFORMACIÓN */}

                      <div className="relative z-10 px-4 pb-4 -mt-10">
                        {/* NOMBRE */}

                        <h3 className="inline-block bg-black/70 backdrop-blur-sm text-xl md:text-[22px] font-black text-white px-3 py-1 rounded-md shadow-lg leading-tight">
                          {jugador.nombre}
                        </h3>

                        {/* POSICIÓN */}

                        <div className="mt-2">
                          <span className="inline-block bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-md text-xs md:text-sm font-black uppercase tracking-[0.16em] shadow-lg">
                            {jugador.posicion ||
                              "Jugador"}
                          </span>
                        </div>

                        {/* ESTADÍSTICAS */}

                        <div className="mt-3 rounded-xl overflow-hidden border border-white/30 bg-black/55 backdrop-blur-md">
                          <div className="grid grid-cols-3 divide-x divide-white/30">
                            <div className="text-center py-3">
                              <p className="text-lg md:text-xl font-black text-white">
                                {jugador.ppg.toFixed(
                                  1
                                )}
                              </p>

                              <p className="text-[10px] md:text-xs font-bold text-white/80 mt-0.5">
                                PTS
                              </p>
                            </div>

                            <div className="text-center py-3">
                              <p className="text-lg md:text-xl font-black text-white">
                                {jugador.rpg.toFixed(
                                  1
                                )}
                              </p>

                              <p className="text-[10px] md:text-xs font-bold text-white/80 mt-0.5">
                                REB
                              </p>
                            </div>

                            <div className="text-center py-3">
                              <p className="text-lg md:text-xl font-black text-white">
                                {jugador.apg.toFixed(
                                  1
                                )}
                              </p>

                              <p className="text-[10px] md:text-xs font-bold text-white/80 mt-0.5">
                                AST
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
              <div className="text-6xl mb-5">
                🏀
              </div>

              <h3 className="text-2xl font-black text-blue-950">
                No hay jugadores registrados
              </h3>

              <p className="text-gray-500 mt-2">
                Este equipo todavía no tiene
                jugadores registrados.
              </p>
            </div>
          )}

          {/* VOLVER */}

          <div className="flex justify-center mt-10">
            <Link
              href="/equipos"
              className="inline-flex items-center gap-2 bg-blue-950 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition shadow-lg"
            >
              ← Volver a equipos
            </Link>
          </div>
        </div>

        {/* =====================================
            FOOTER
        ====================================== */}

        <footer className="bg-blue-950 text-white mt-10">
          <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-4">
                <Image
                  src="/logos/LIBAVIME.png"
                  alt="LIBAVIME"
                  width={70}
                  height={70}
                  className="object-contain"
                />

                <div>
                  <p className="text-2xl font-black">
                    LIBAVIME
                  </p>

                  <p className="text-cyan-400 font-black">
                    STATS
                  </p>
                </div>
              </div>

              <div className="text-center md:text-right">
                <p className="font-semibold">
                  Liga de Baloncesto de Visitadores Médicos
                </p>

                <p className="text-blue-300 text-sm mt-1">
                  Estadísticas · Equipos · Jugadores · Partidos
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 mt-8 pt-5 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-blue-300">
              <p>
                © 2026 LIBAVIME · Todos los derechos
                reservados.
              </p>

              <p>
               Diseñado y desarrollado por{" "}
               <span className="font-black text-grey-900 text-base">
               Emmi De La Cruz
               </span>
               </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}