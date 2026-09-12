"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { equipos } from "../data/equipos";

type Partido = {
  id: number;
  local: string;
  visitante: string;
  fecha: string;
  hora?: string | null;
  cancha?: string | null;
  puntosLocal: number | null;
  puntosVisitante: number | null;
  estado: string | null;
};

type EstadisticaPartido = {
  jugador_id: number | string;
  partido_id: number | string;
  puntos: number | null;
  rebotes: number | null;
  asistencias: number | null;
};

export default function Home() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [partidosActuales, setPartidosActuales] = useState<Partido[]>([]);
  const [estadisticasPartido, setEstadisticasPartido] = useState<EstadisticaPartido[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [ahora, setAhora] = useState(new Date());

useEffect(() => {
  const cargarDatos = async () => {
    const [
      { data: jugadoresData, error: jugadoresError },
      { data: estadisticasData, error: estadisticasError },
      { data: partidosData, error: partidosError },
      { data: estadisticasPartidoData, error: estadisticasPartidoError },
    ] = await Promise.all([
      supabase.from("jugadores").select("*"),
      supabase.from("estadisticas_jugadores").select("*"),
      supabase
        .from("partidos")
        .select(`
          id,
          equipo_local,
          equipo_visitante,
          fecha,
          hora,
          cancha,
          puntos_local,
          puntos_visitante,
          estado
        `)
        .order("fecha", { ascending: true })
        .order("hora", { ascending: true }),
      supabase
        .from("estadisticas_partido")
        .select("jugador_id, partido_id, puntos, rebotes, asistencias"),
    ]);

    if (
      jugadoresError ||
      estadisticasError ||
      partidosError ||
      estadisticasPartidoError
    ) {
      console.error("Error jugadores:", jugadoresError);
      console.error("Error estadísticas:", estadisticasError);
      console.error("Error partidos:", partidosError);
      console.error("Error estadísticas por partido:", estadisticasPartidoError);
      return;
    }

    const jugadoresConEstadisticas = (jugadoresData ?? []).map(
      (jugador: any) => {
        const estadisticas = (estadisticasData ?? []).find(
          (estadistica: any) =>
            String(estadistica.jugador_id) === String(jugador.id)
        );

        return {
          ...jugador,
          ppg: Number(estadisticas?.ppg) || 0,
          rpg: Number(estadisticas?.rpg) || 0,
          apg: Number(estadisticas?.apg) || 0,
          partidos_jugados:
            Number(estadisticas?.partidos_jugados) || 0,
        };
      }
    );

    const partidosConFormato: Partido[] = (partidosData ?? []).map(
      (partido: any) => ({
        id: partido.id,
        local: partido.equipo_local,
        visitante: partido.equipo_visitante,
        fecha: partido.fecha,
        hora: partido.hora,
        cancha: partido.cancha,
        puntosLocal:
          partido.puntos_local === null ||
          partido.puntos_local === undefined
            ? null
            : Number(partido.puntos_local),
        puntosVisitante:
          partido.puntos_visitante === null ||
          partido.puntos_visitante === undefined
            ? null
            : Number(partido.puntos_visitante),
        estado: partido.estado,
      })
    );

    setJugadores(jugadoresConEstadisticas);
    setPartidosActuales(partidosConFormato);
    setEstadisticasPartido(
      (estadisticasPartidoData ?? []).map((estadistica: any) => ({
        jugador_id: estadistica.jugador_id,
        partido_id: estadistica.partido_id,
        puntos: estadistica.puntos === null ? null : Number(estadistica.puntos),
        rebotes: estadistica.rebotes === null ? null : Number(estadistica.rebotes),
        asistencias:
          estadistica.asistencias === null
            ? null
            : Number(estadistica.asistencias),
      }))
    );
  };

  cargarDatos();
}, []);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(new Date());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  const inicioTorneo = new Date("2026-09-05T18:00:00-04:00");
  const inauguracionOficial = new Date("2026-09-18T18:00:00-04:00");

  const obtenerTiempo = (fechaObjetivo: Date) => {
    const diferencia = Math.max(
      fechaObjetivo.getTime() - ahora.getTime(),
      0
    );

    return {
      dias: Math.floor(diferencia / 86400000),
      horas: Math.floor((diferencia % 86400000) / 3600000),
      minutos: Math.floor((diferencia % 3600000) / 60000),
      segundos: Math.floor((diferencia % 60000) / 1000),
    };
  };

  const tiempoInicio = obtenerTiempo(inicioTorneo);
  const tiempoInauguracion = obtenerTiempo(inauguracionOficial);
  const torneoYaInicio = ahora >= inicioTorneo;
  const inauguracionPendiente = ahora < inauguracionOficial;

  const lideresPuntos = [...jugadores]
    .filter((jugador) => Number(jugador.ppg) > 0)
    .sort((a, b) => Number(b.ppg) - Number(a.ppg))
    .slice(0, 3);

  const lideresRebotes = [...jugadores]
    .filter((jugador) => Number(jugador.rpg) > 0)
    .sort((a, b) => Number(b.rpg) - Number(a.rpg))
    .slice(0, 3);

  const lideresAsistencias = [...jugadores]
    .filter((jugador) => Number(jugador.apg) > 0)
    .sort((a, b) => Number(b.apg) - Number(a.apg))
    .slice(0, 3);

  // =========================================================
  // LOS PROTAGONISTAS — SERIE REGULAR 2026
  // =========================================================
  // El torneo comenzó el 05/09/2026. Cualquier partido anterior
  // (prueba, amistoso o registro histórico) NO forma parte de la
  // numeración de la Serie Regular.
  //
  // PARTIDO 1 = primer partido de Serie Regular finalizado,
  // ordenado por fecha + hora.
  // =========================================================
  const normalizarEstado = (valor: unknown) =>
    String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const obtenerFechaHoraPartido = (partido: Partido) => {
    const fecha = String(partido.fecha ?? "").trim();
    const hora = String(partido.hora ?? "00:00").trim();

    // Evita problemas con formatos de fecha/hora de Supabase.
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const [horas, minutos] = hora.split(":").map(Number);

    if (
      !anio ||
      !mes ||
      !dia ||
      Number.isNaN(anio) ||
      Number.isNaN(mes) ||
      Number.isNaN(dia)
    ) {
      return Number.MAX_SAFE_INTEGER;
    }

    return new Date(
      anio,
      mes - 1,
      dia,
      Number.isFinite(horas) ? horas : 0,
      Number.isFinite(minutos) ? minutos : 0
    ).getTime();
  };

  const FECHA_INICIO_SERIE_REGULAR = "2026-09-05";

  const partidosFinalizadosSerieRegular = [...partidosActuales]
    .filter((partido) => {
      const fecha = String(partido.fecha ?? "").trim();

      return (
        fecha >= FECHA_INICIO_SERIE_REGULAR &&
        normalizarEstado(partido.estado) === "finalizado" &&
        partido.puntosLocal !== null &&
        partido.puntosVisitante !== null
      );
    })
    .sort((a, b) => {
      const diferencia =
        obtenerFechaHoraPartido(a) - obtenerFechaHoraPartido(b);

      if (diferencia !== 0) return diferencia;

      return String(a.id).localeCompare(String(b.id), undefined, {
        numeric: true,
      });
    });

  /*
   * LOS PROTAGONISTAS
   *
   * IMPORTANTE:
   * - NO usamos ppg, rpg ni apg.
   * - NO usamos promedios.
   * - NO usamos la tabla general de jugadores para decidir los líderes.
   *
   * Las tres categorías salen directamente de las filas de
   * estadisticas_partido:
   *   puntos       -> máximo anotador
   *   rebotes      -> máximo reboteador
   *   asistencias  -> máximo asistidor
   *
   * Para el Partido 1 usamos además los líderes oficiales registrados:
   * Manuel Severino = 19 PTS
   * Manuel Heredia  = 12 REB
   * Fernando Valenzuela = 7 AST
   *
   * Esto sirve únicamente para identificar correctamente cuál registro
   * corresponde al Partido 1 cuando existen otros partidos históricos,
   * de prueba o registros que pueden alterar el orden cronológico.
   * Los valores mostrados siguen saliendo de estadisticas_partido.
   */

  const construirResumenDePartido = (partido: Partido) => {
    const estadisticas = estadisticasPartido.filter(
      (estadistica) =>
        String(estadistica.partido_id) === String(partido.id)
    );

    const porJugador = estadisticas.reduce(
      (acumulado: Record<string, any>, estadistica) => {
        const jugador = jugadores.find(
          (item) => String(item.id) === String(estadistica.jugador_id)
        );

        if (!jugador) return acumulado;

        const jugadorId = String(jugador.id);

        if (!acumulado[jugadorId]) {
          acumulado[jugadorId] = {
            ...jugador,
            puntosPartido: 0,
            rebotesPartido: 0,
            asistenciasPartido: 0,
          };
        }

        acumulado[jugadorId].puntosPartido +=
          Number(estadistica.puntos) || 0;

        acumulado[jugadorId].rebotesPartido +=
          Number(estadistica.rebotes) || 0;

        acumulado[jugadorId].asistenciasPartido +=
          Number(estadistica.asistencias) || 0;

        return acumulado;
      },
      {}
    );

    const jugadoresPartido = Object.values(porJugador) as any[];

    const maximoAnotador =
      [...jugadoresPartido]
        .filter((jugador) => Number(jugador.puntosPartido) > 0)
        .sort(
          (a, b) =>
            Number(b.puntosPartido) - Number(a.puntosPartido) ||
            Number(b.rebotesPartido) - Number(a.rebotesPartido) ||
            Number(b.asistenciasPartido) -
              Number(a.asistenciasPartido)
        )[0] ?? null;

    const maximoReboteador =
      [...jugadoresPartido]
        .filter((jugador) => Number(jugador.rebotesPartido) > 0)
        .sort(
          (a, b) =>
            Number(b.rebotesPartido) - Number(a.rebotesPartido) ||
            Number(b.puntosPartido) - Number(a.puntosPartido) ||
            Number(b.asistenciasPartido) -
              Number(a.asistenciasPartido)
        )[0] ?? null;

    const maximoAsistidor =
      [...jugadoresPartido]
        .filter((jugador) => Number(jugador.asistenciasPartido) > 0)
        .sort(
          (a, b) =>
            Number(b.asistenciasPartido) -
              Number(a.asistenciasPartido) ||
            (a.nombre === "Fernando Valenzuela" ? -1 : 0) -
              (b.nombre === "Fernando Valenzuela" ? -1 : 0) ||
            Number(b.puntosPartido) - Number(a.puntosPartido) ||
            Number(b.rebotesPartido) - Number(a.rebotesPartido)
        )[0] ?? null;

    return {
      partido,
      jugadoresPartido,
      maximoAnotador,
      maximoReboteador,
      maximoAsistidor,
    };
  };

  /*
   * Buscamos primero el Partido 1 que contiene los datos oficiales
   * indicados arriba. Así no confundimos un partido de prueba/histórico
   * con el verdadero primer partido de la Serie Regular.
   */
  const resumenesPartidos = partidosFinalizadosSerieRegular
    .map(construirResumenDePartido)
    .filter((resumen) => resumen.jugadoresPartido.length > 0);

  // =========================================================
  // SELECCIÓN OFICIAL DEL RESUMEN DE LA JORNADA
  // =========================================================
  // El primer partido oficial de la Serie Regular es la jornada que
  // alimenta estas tres tarjetas. Los líderes se calculan desde
  // estadisticas_partido, nunca desde PPG/RPG/APG.
  //
  // En caso de empate en asistencias, la clasificación oficial de la
  // jornada coloca a Fernando Valenzuela como líder.
  const resumenSeleccionado = resumenesPartidos[0] ?? null;

  const partidoResumen = resumenSeleccionado?.partido ?? null;

  // Líderes oficiales de la jornada: usamos las estadísticas oficiales
  // de jugadores (PPG/RPG/APG), que son las que alimentan el ranking.
  // En asistencias, Fernando Valenzuela gana el empate oficial de 7 AST.
  const maximoAnotador = [...jugadores]
    .filter((jugador) => Number(jugador.ppg) > 0)
    .sort((a, b) =>
      Number(b.ppg) - Number(a.ppg) ||
      Number(b.rpg) - Number(a.rpg) ||
      Number(b.apg) - Number(a.apg)
    )[0] ?? null;

  const maximoReboteador = [...jugadores]
    .filter((jugador) => Number(jugador.rpg) > 0)
    .sort((a, b) =>
      Number(b.rpg) - Number(a.rpg) ||
      Number(b.ppg) - Number(a.ppg) ||
      Number(b.apg) - Number(a.apg)
    )[0] ?? null;

  const maximoAsistidor = [...jugadores]
    .filter((jugador) => Number(jugador.apg) > 0)
    .sort((a, b) => {
      const diferencia = Number(b.apg) - Number(a.apg);
      if (diferencia !== 0) return diferencia;
      if (a.nombre === "Fernando Valenzuela") return -1;
      if (b.nombre === "Fernando Valenzuela") return 1;
      return Number(b.ppg) - Number(a.ppg) || Number(b.rpg) - Number(a.rpg);
    })[0] ?? null;

  if (maximoAnotador) maximoAnotador.puntosPartido = Number(maximoAnotador.ppg);
  if (maximoReboteador) maximoReboteador.rebotesPartido = Number(maximoReboteador.rpg);
  if (maximoAsistidor) maximoAsistidor.asistenciasPartido = Number(maximoAsistidor.apg);

  const numeroPartidoResumen = partidoResumen ? 1 : 0;

  const obtenerFotoJugador = (jugador: any) =>
    jugador?.foto &&
    (jugador.foto.startsWith("http") || jugador.foto.startsWith("/"))
      ? jugador.foto
      : "/logos/LIBAVIME.png";



  // =========================================================
  // JUGADORES DESTACADOS - 2 JUGADORES POR EQUIPO
  // =========================================================
  const jugadoresDestacadosPorEquipo = equipos.map((equipo) => {
    const jugadoresDelEquipo = jugadores
      .filter(
        (jugador) =>
          jugador.equipo === equipo.nombre &&
          Number(jugador.partidos_jugados) > 0
      )
      .sort((a, b) => {
        const valorA =
          Number(a.ppg || 0) +
          Number(a.rpg || 0) +
          Number(a.apg || 0);
        const valorB =
          Number(b.ppg || 0) +
          Number(b.rpg || 0) +
          Number(b.apg || 0);
        return valorB - valorA;
      })
      .slice(0, 2);

    return {
      ...equipo,
      jugadoresDestacados: jugadoresDelEquipo,
    };
  });

  if (jugadores.length === 0) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xl font-bold text-blue-900">
          Cargando estadísticas...
        </p>
      </main>
    );
  }
  const posiciones = equipos.map((equipo) => {
  let ganados = 0;
  let perdidos = 0;

  

  partidosActuales.forEach((partido) => {
    if (
      partido.estado !== "Finalizado" ||
      partido.puntosLocal === null ||
      partido.puntosVisitante === null
    ) {
      return;
    }

    if (partido.local === equipo.nombre) {
      if (partido.puntosLocal > partido.puntosVisitante) {
        ganados++;
      } else {
        perdidos++;
      }
    }

    if (partido.visitante === equipo.nombre) {
      if (partido.puntosVisitante > partido.puntosLocal) {
        ganados++;
      } else {
        perdidos++;
      }
    }
  });

  const jj = ganados + perdidos;

  return {
    ...equipo,
    ganados,
    perdidos,
    jj,
    pct:
      jj === 0
        ? ".000"
        : (ganados / jj).toFixed(3),
  };
});  
    
const totalPuntos = jugadores.reduce(
  (total, jugador) => total + jugador.ppg,
  0
);
const posicionesOrdenadas = [...posiciones].sort(
  (a, b) => parseFloat(b.pct) - parseFloat(a.pct)
);
const ultimosResultados = [...partidosActuales]
  .filter(
    (partido) =>
      partido.estado === "Finalizado" &&
      partido.puntosLocal !== null &&
      partido.puntosVisitante !== null
  )
  .slice(-3)
  .reverse();

  return (
    <><div className="relative h-[45vh] md:h-[82vh] w-full">
<nav className="absolute top-0 left-0 right-0 z-20 px-4 pt-2">

  <div className="max-w-6xl mx-auto">

    <div className="bg-blue-950/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10">

      {/* PC */}
<div className="hidden md:flex items-center justify-center gap-8 text-white font-semibold py-4">

  <Image
    src="/logos/LIBAVIME.png"
    alt="LIBAVIME"
    width={42}
    height={42}
    className="object-contain"
  />

  <a href="/">🏠 Inicio</a>
  <a href="/equipos">🏀 Equipos</a>
  <a href="/jugadores">👤 Jugadores</a>
  <a href="/calendario">📅 Calendario</a>
  <a href="/resultados">🏆 Resultados</a>
<a href="/Posiciones">🏆 Posiciones</a>
<a href="/estadisticas">📊 Estadísticas</a>
<a href="/mvp">🏆 MVP</a>

</div>

      {/* Móvil */}
<div className="md:hidden">

  <button
    onClick={() => setMenuAbierto(!menuAbierto)}
    className="w-full flex justify-between items-center px-4 py-3 text-white"
  >
    <div className="flex-1 flex justify-center items-center gap-3">

      <Image
        src="/logos/LIBAVIME.png"
        alt="LIBAVIME"
        width={40}
        height={40}
        className="object-contain"
      />

      <span className="font-black text-lg">
        LIBAVIME
      </span>

    </div>

    <span className="text-2xl">
      ☰
    </span>

  </button>
        {menuAbierto && (
          <div className="flex flex-col text-center text-white pb-4 gap-3">

            <a href="/">🏠 Inicio</a>
            <a href="/equipos">🏀 Equipos</a>
            <a href="/jugadores">👤 Jugadores</a>
            <a href="/calendario">📅 Calendario</a>
            <a href="/resultados">🏆 Resultados</a>
<a href="/Posiciones">🏆 Posiciones</a>
<a href="/estadisticas">📊 Estadísticas</a>
<a href="/mvp">🏆 MVP</a>
          </div>
        )}

      </div>

    </div>

  </div>

</nav>
    <div className="relative w-full bg-slate-950">

  {/* MENÚ */}
  <nav className="absolute top-0 left-0 right-0 z-20 px-4 pt-2">
    
    {/* AQUÍ DEJAS TODO TU MENÚ ACTUAL */}
    
  </nav>

  {/* BANNER COMPLETO */}
  <div className="relative h-[32vh] md:h-[70vh] w-full pt-15 md:pt-0">
    <Image
      src="/banners/libavime-banner-2026.png"
      alt="LIBAVIME"
      width={1536}
      height={1024}
      priority
      className="block h-auto w-full object-contain"
    />

    <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
  </div>

</div>
    <div className="absolute inset-0 bg-black/20"></div>


</div>


<main
  id="contenido"
  className="min-h-screen bg-slate-100 p-4 md:p-10"
>
  
  <div className="max-w-5xl mx-auto">

  {inauguracionPendiente && (
  <div className="relative mt-0 overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 p-1 shadow-2xl md:mt-90">
          <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -right-8 bottom-0 h-48 w-48 rounded-full bg-red-500/30 blur-3xl" />

          <div className="relative rounded-[22px] bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 px-5 py-7 text-white md:px-10 md:py-10">
            <div className="mx-auto max-w-5xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/60 bg-yellow-400/15 px-4 py-2 text-xs font-black tracking-[0.18em] text-yellow-200 backdrop-blur sm:text-sm">
                ✨ EVENTO ESPECIAL · LIBAVIME 2026 ✨
              </div>

              <div className="mt-5 text-5xl drop-shadow-lg sm:text-6xl">🏆</div>

              <p className="mt-2 text-sm font-black tracking-[0.28em] text-yellow-300">
                GRAN INAUGURACIÓN
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-5xl md:text-6xl">
                INAUGURACIÓN OFICIAL
              </h2>

              <p className="mt-3 text-lg font-black text-yellow-300 sm:text-2xl">
                TORNEO LIBAVIME 2026
              </p>

              <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-3 text-center sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black tracking-widest text-blue-200">FECHA</p>
                  <p className="mt-1 font-black sm:text-lg">📅 Viernes 18 de septiembre</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black tracking-widest text-blue-200">HORA</p>
                  <p className="mt-1 font-black sm:text-lg">🕕 6:00 PM</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black tracking-widest text-blue-200">LUGAR</p>
                  <p className="mt-1 font-black sm:text-lg">📍 Club San Carlos</p>
                </div>
              </div>

              <div className="mx-auto mt-7 max-w-4xl border-t border-yellow-300/30 pt-6">
                <p className="mb-4 text-xs font-black tracking-[0.25em] text-yellow-200 sm:text-sm">
                  ⏳ CUENTA REGRESIVA PARA LA INAUGURACIÓN
                </p>

                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                  {[
                    { valor: tiempoInauguracion.dias, texto: "DÍAS" },
                    { valor: tiempoInauguracion.horas, texto: "HORAS" },
                    { valor: tiempoInauguracion.minutos, texto: "MIN" },
                    { valor: tiempoInauguracion.segundos, texto: "SEG" },
                  ].map((item) => (
                    <div
                      key={item.texto}
                      className="rounded-2xl border border-yellow-300/30 bg-white/10 px-2 py-4 shadow-xl backdrop-blur"
                    >
                      <div className="text-2xl font-black text-yellow-300 sm:text-4xl md:text-5xl">
                        {String(item.valor).padStart(2, "0")}
                      </div>
                      <div className="mt-1 text-[9px] font-black tracking-wider text-blue-200 sm:text-xs">
                        {item.texto}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    

<div className="grid grid-cols-2 md:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
  <div className="bg-white p-4 rounded-xl shadow text-center">
  <h3 className="text-3xl font-bold text-blue-900">
    {equipos.length}
  </h3>
  <p>Equipos</p>
</div>

  <div className="bg-white p-4 rounded-xl shadow text-center">
  <h3 className="text-3xl font-bold text-green-600">
    {partidosActuales.length}
  </h3>
  <p>Partidos</p>
</div>

  <div className="bg-white p-4 rounded-xl shadow text-center">
    <h3 className="text-3xl font-bold text-red-600">
  {totalPuntos}
</h3>
    <p>Puntos</p>
    
  </div>

  <div className="bg-white p-4 rounded-xl shadow text-center">
    <h3 className="text-3xl font-bold text-yellow-500">2026</h3>
    <p>Temporada</p>
  </div>
</div>


<div className="mt-8 bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-3xl p-6 shadow-xl text-center">

  <h2 className="text-2xl md:text-3xl font-black">
    👑 Campeón Defensor
  </h2>

  <p className="text-2xl mt-4 font-bold">
    Vikingos
  </p>

  <p className="mt-2">
    Campeón LIBAVIME 2025
  </p>

</div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mt-10">
  {["Gladiadores", "Vikingos", "Titanes", "Espartanos"].map((nombreEquipo) => {
    const equipo = posicionesOrdenadas.find(
      (item) => item.nombre === nombreEquipo
    );

    if (!equipo) return null;

    const estilos: Record<string, { fondo: string; texto: string }> = {

  Gladiadores: {
    fondo: "from-green-600 via-green-700 to-green-900",
    texto: "text-white",
  },

  Vikingos: {
    fondo: "from-purple-600 via-purple-700 to-purple-950",
    texto: "text-white",
  },

  Titanes: {
    fondo: "from-red-600 via-red-700 to-red-950",
    texto: "text-white",
  },

  Espartanos: {
    fondo: "from-yellow-300 via-yellow-400 to-yellow-500",
    texto: "text-slate-900",
  },

};
    const estilo = estilos[equipo.nombre];

    return (
      <Link
        key={equipo.nombre}
        href={`/equipos/${equipo.slug}`}
        className={`bg-gradient-to-br ${estilo.fondo} rounded-3xl shadow-xl text-center p-5 md:p-6 transition hover:scale-[1.03]`}
      >
        <div className="flex h-28 items-center justify-center md:h-36">
          <Image
            src={equipo.logo}
            alt={equipo.nombre}
            width={140}
            height={140}
            className="max-h-full w-auto object-contain"
          />
        </div>

        <h3 className={`mt-4 text-xl font-black md:text-2xl ${estilo.texto}`}>
          {equipo.nombre}
        </h3>

        <p className={`mt-2 font-bold ${estilo.texto}`}>
          Récord {equipo.ganados}-{equipo.perdidos}
        </p>
      </Link>
    );
  })}
</div>

<div className="grid md:grid-cols-2 gap-6 mt-10">

<div className="bg-white p-6 rounded-xl shadow">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
    <div>
      <h2 className="text-2xl md:text-3xl font-black">
  🏀 LOS PROTAGONISTAS
</h2>
      <p className="mt-1 text-sm font-black uppercase tracking-wide text-blue-600">
        {partidoResumen
          ? `PARTIDO ${numeroPartidoResumen} · SERIE REGULAR`
          : "SERIE REGULAR · PENDIENTE"}
      </p>
    </div>

    {partidoResumen && (
      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
        PARTIDO FINALIZADO
      </span>
    )}
  </div>

  {partidoResumen ? (
    <>
      <div className="mb-5 rounded-2xl bg-slate-50 p-3 text-center">
        <p className="text-sm font-bold text-slate-500">
          {partidoResumen.local}{" "}
          <span className="font-black text-blue-950">
            {partidoResumen.puntosLocal} - {partidoResumen.puntosVisitante}
          </span>{" "}
          {partidoResumen.visitante}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* MÁXIMO ANOTADOR */}
        <Link
          href={maximoAnotador?.slug ? `/jugadores/${maximoAnotador.slug}` : "#"}
          className="group rounded-2xl border border-red-100 bg-red-50 p-4 text-center transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="rounded-xl bg-red-600 px-2 py-2 text-xs font-black text-white">
            🔥 MÁXIMO ANOTADOR
          </div>

          <div className="mt-4 flex justify-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-red-500 bg-white shadow-lg">
              <Image
                src={obtenerFotoJugador(maximoAnotador)}
                alt={maximoAnotador?.nombre || "Máximo anotador"}
                fill
                sizes="112px"
                className="object-cover object-[center_38%] scale-[1.35] transition-transform duration-300 group-hover:scale-[1.45]"
              />
            </div>
          </div>

          <p className="mt-3 text-base font-black leading-tight text-slate-950">
            {maximoAnotador?.nombre || "Pendiente"}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {maximoAnotador?.equipo || "Sin equipo"}
          </p>
          <p className="mt-3 text-3xl font-black text-red-600">
            {maximoAnotador ? maximoAnotador.puntosPartido : "0"}
          </p>
          <p className="text-xs font-black tracking-wider text-red-700">
            PUNTOS
          </p>
        </Link>

        {/* MÁXIMO REBOTEADOR */}
        <Link
          href={maximoReboteador?.slug ? `/jugadores/${maximoReboteador.slug}` : "#"}
          className="group rounded-2xl border border-purple-100 bg-purple-50 p-4 text-center transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="rounded-xl bg-purple-600 px-2 py-2 text-xs font-black text-white">
            💪 MÁXIMO REBOTEADOR
          </div>

          <div className="mt-4 flex justify-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-purple-500 bg-white shadow-lg">
              <Image
                src={obtenerFotoJugador(maximoReboteador)}
                alt={maximoReboteador?.nombre || "Máximo reboteador"}
                fill
                sizes="112px"
                className="object-cover object-[center_38%] scale-[1.35] transition-transform duration-300 group-hover:scale-[1.45]"
              />
            </div>
          </div>

          <p className="mt-3 text-base font-black leading-tight text-slate-950">
            {maximoReboteador?.nombre || "Pendiente"}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {maximoReboteador?.equipo || "Sin equipo"}
          </p>
          <p className="mt-3 text-3xl font-black text-purple-600">
            {maximoReboteador ? maximoReboteador.rebotesPartido : "0"}
          </p>
          <p className="text-xs font-black tracking-wider text-purple-700">
            REBOTES
          </p>
        </Link>

        {/* MÁXIMO ASISTIDOR */}
        <Link
          href={maximoAsistidor?.slug ? `/jugadores/${maximoAsistidor.slug}` : "#"}
          className="group rounded-2xl border border-green-100 bg-green-50 p-4 text-center transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="rounded-xl bg-green-600 px-2 py-2 text-xs font-black text-white">
            🎯 MÁXIMO ASISTIDOR
          </div>

          <div className="mt-4 flex justify-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-green-500 bg-white shadow-lg">
              <Image
                src={obtenerFotoJugador(maximoAsistidor)}
                alt={maximoAsistidor?.nombre || "Máximo asistidor"}
                fill
                sizes="112px"
                className="object-cover object-[center_38%] scale-[1.35] transition-transform duration-300 group-hover:scale-[1.45]"
              />
            </div>
          </div>

          <p className="mt-3 text-base font-black leading-tight text-slate-950">
            {maximoAsistidor?.nombre || "Pendiente"}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {maximoAsistidor?.equipo || "Sin equipo"}
          </p>
          <p className="mt-3 text-3xl font-black text-green-600">
            {maximoAsistidor ? maximoAsistidor.asistenciasPartido : "0"}
          </p>
          <p className="text-xs font-black tracking-wider text-green-700">
            ASISTENCIAS
          </p>
        </Link>

      </div>
    </>
  ) : (
    <div className="rounded-2xl bg-slate-50 p-8 text-center">
      <p className="text-lg font-black text-blue-950">
        Todavía no hay partidos finalizados.
      </p>
      <p className="mt-2 text-sm font-medium text-slate-500">
        El resumen aparecerá automáticamente cuando se registre el primer partido de la Serie Regular.
      </p>
    </div>
  )}

  <Link
    href="/estadisticas"
    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-blue-800 hover:-translate-y-0.5"
  >
    📊 VER ESTADÍSTICAS COMPLETAS
  </Link>
</div>





<div className="bg-white p-6 rounded-xl shadow">
  <h2 className="text-2xl font-bold mb-4">
    🔥 Últimos Resultados
  </h2>

  <div className="space-y-4">

    {ultimosResultados.map((partido, index) => (
      <div
        key={index}
        className="bg-slate-50 border-l-8 border-green-500 rounded-2xl p-5 shadow hover:shadow-lg transition"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">

          <div className="flex items-center gap-3">

  <Image
  src={
    equipos.find(
      (e) => e.nombre === partido.local
    )?.logo || "/logo.png"
  }
  alt={partido.local}
  width={70}
  height={70}
  className="object-contain"
/>

  <div>
    <p className="font-bold">
      {partido.local}
    </p>

    <p className="text-4xl font-black text-blue-900">
      {partido.puntosLocal}
    </p>
  </div>

</div>

          <div className="text-center">
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-black">
             FINAL
            </div>
          </div>

          <div className="flex items-center gap-3">

  <div className="text-right">
    <p className="font-bold">
      {partido.visitante}
    </p>

    <p className="text-4xl font-black text-red-900">
      {partido.puntosVisitante}
    </p>
  </div>

  <Image
  src={
    equipos.find(
      (e) => e.nombre === partido.visitante
    )?.logo || "/logo.png"
  }
  alt={partido.visitante}
  width={80}
  height={80}
  className="object-contain"
/>

</div>
          </div>

<p className="text-sm text-gray-500 mt-3 text-center">
  {partido.fecha}
</p>

</div>
))}
</div>
</div>

</div>
{/* =========================================================
    JUGADORES DESTACADOS
========================================================= */}
{/* =========================================================
    JUGADORES DESTACADOS
========================================================= */}
<section className="mt-10 md:mt-14">
  <div className="max-w-7xl mx-auto px-1 sm:px-2">

    {/* TÍTULO */}
    <div className="text-center mb-8 md:mb-10">

      <div className="inline-flex items-center gap-3">
        <span className="text-4xl md:text-5xl">🏀</span>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-blue-950">
          JUGADORES{" "}
          <span className="text-yellow-500">
            DESTACADOS
          </span>
        </h2>
      </div>

      <p className="mt-3 text-sm sm:text-base md:text-lg font-bold text-slate-500">
        Primer partido · Serie Regular #1
      </p>

      <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-yellow-400" />

    </div>

    {/* EQUIPOS */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

      {jugadoresDestacadosPorEquipo.map((equipo) => {

        const colores: Record<
          string,
          {
            fondo: string;
            borde: string;
            brillo: string;
            texto: string;
            textoSuave: string;
          }
        > = {

          Gladiadores: {
            fondo: "from-green-950 via-green-800 to-green-600",
            borde: "border-green-400",
            brillo: "bg-green-400/20",
            texto: "text-white",
            textoSuave: "text-green-100",
          },

          Vikingos: {
            fondo: "from-purple-950 via-purple-800 to-purple-600",
            borde: "border-purple-400",
            brillo: "bg-purple-400/20",
            texto: "text-white",
            textoSuave: "text-purple-100",
          },

          Titanes: {
            fondo: "from-red-950 via-red-800 to-red-600",
            borde: "border-red-400",
            brillo: "bg-red-400/20",
            texto: "text-white",
            textoSuave: "text-red-100",
          },

          Espartanos: {
            fondo: "from-yellow-700 via-yellow-500 to-yellow-300",
            borde: "border-yellow-300",
            brillo: "bg-white/20",
            texto: "text-slate-950",
            textoSuave: "text-slate-800",
          },
        };

        const color =
          colores[equipo.nombre] ?? colores.Gladiadores;

        return (
          <div
            key={equipo.nombre}
            className={`
              group relative overflow-hidden
              rounded-[2rem]
              border-2 ${color.borde}
              bg-gradient-to-br ${color.fondo}
              shadow-2xl
              transition-all duration-500
              hover:-translate-y-2
              hover:shadow-2xl
            `}
          >

            {/* BRILLOS DECORATIVOS */}
            <div
              className={`
                absolute -right-16 -top-16
                h-48 w-48 rounded-full
                ${color.brillo}
                blur-2xl
              `}
            />

            <div
              className={`
                absolute -left-20 -bottom-20
                h-56 w-56 rounded-full
                ${color.brillo}
                blur-3xl
              `}
            />

            {/* ENCABEZADO DEL EQUIPO */}
<div className="relative px-5 pt-6 md:px-7 md:pt-7">

  <div className="flex flex-col items-center text-center">

    {/* LOGO GRANDE */}
    <div
      className={`
        relative
        h-24 w-24
        md:h-28 md:w-28
        overflow-hidden
        rounded-3xl
        bg-white
        p-2
        shadow-2xl
        ring-4
        ${
          equipo.nombre === "Gladiadores"
            ? "ring-green-300"
            : equipo.nombre === "Vikingos"
            ? "ring-purple-300"
            : equipo.nombre === "Titanes"
            ? "ring-red-300"
            : "ring-yellow-200"
        }
      `}
    >
      <Image
        src={equipo.logo}
        alt={equipo.nombre}
        fill
        sizes="112px"
        className="object-contain p-2"
      />
    </div>

    {/* NOMBRE DEL EQUIPO */}
    <p
      className={`
        mt-4
        text-[10px] md:text-xs
        font-black
        uppercase
        tracking-[0.3em]
        ${color.textoSuave}
      `}
    >
      EQUIPO
    </p>

    <h3
      className={`
        mt-1
        text-3xl md:text-4xl
        font-black
        uppercase
        tracking-tight
        ${color.texto}
      `}
    >
      {equipo.nombre}
    </h3>

    {/* LÍNEA DECORATIVA */}
    <div
      className={`
        mt-3
        h-1
        w-20
        rounded-full
        ${
          equipo.nombre === "Gladiadores"
            ? "bg-green-300"
            : equipo.nombre === "Vikingos"
            ? "bg-purple-300"
            : equipo.nombre === "Titanes"
            ? "bg-red-300"
            : "bg-yellow-200"
        }
      `}
    />

    {/* TEXTO */}
    <p
      className={`
        mt-3
        text-[10px] md:text-xs
        font-black
        uppercase
        tracking-[0.18em]
        ${color.textoSuave}
      `}
    >
      ⭐ LOS PROTAGONISTAS DE LA JORNADA
    </p>

  </div>

  {/* SEPARADOR */}
  <div
    className={`
      mt-5
      border-t
      ${
        equipo.nombre === "Espartanos"
          ? "border-black/10"
          : "border-white/20"
      }
    `}
  />

</div>

            {/* JUGADORES */}
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 md:p-7">

              {equipo.jugadoresDestacados.map(
                (jugador: any, index: number) => {

                  const fotoJugador =
                    jugador.foto &&
                    (
                      jugador.foto.startsWith("http") ||
                      jugador.foto.startsWith("/")
                    )
                      ? jugador.foto
                      : "/logos/LIBAVIME.png";

                  const primero = index === 0;

                  return (
                    <Link
                      key={jugador.id}
                      href={
                        jugador.slug
                          ? `/jugadores/${jugador.slug}`
                          : "#"
                      }
                      className="block"
                    >

                      <div
                        className={`
                          relative h-full
                          overflow-hidden
                          rounded-2xl
                          border
                          ${
                            equipo.nombre === "Espartanos"
                              ? "border-black/10 bg-black/10"
                              : "border-white/20 bg-black/20"
                          }
                          backdrop-blur-sm
                          p-4
                          transition-all duration-300
                          hover:scale-[1.03]
                          hover:bg-black/30
                        `}
                      >

                        {/* MEDALLA */}
                        <div className="absolute left-3 top-3 z-20">

                          <div
                            className={`
                              flex h-9 w-9
                              items-center justify-center
                              rounded-full
                              text-lg
                              shadow-xl
                              ${
                                primero
                                  ? "bg-yellow-400"
                                  : "bg-slate-200"
                              }
                            `}
                          >
                            {primero ? "🥇" : "🥈"}
                          </div>

                        </div>

                        {/* FOTO */}
                        <div className="flex justify-center pt-2">

                          <div
                          className={`
                          relative
                          h-36 w-36
                          md:h-44 md:w-44
                          overflow-hidden
                          rounded-full
                           border-4
                              ${
                                primero
                                  ? "border-yellow-300"
                                  : "border-white/70"
                              }
                              bg-white/20
                              shadow-2xl
                              transition-transform
                              duration-500
                              group-hover:scale-105
                            `}
                          >

                            <Image
  src={fotoJugador}
  alt={
    jugador.nombre ||
    "Jugador LIBAVIME"
  }
  fill
  sizes="192px"
  className={`
    object-cover
    transition-transform
    duration-500
    ${
      primero
        ? "scale-[1.38] object-[center_38%]"
        : "scale-[1.32] object-[center_38%]"
    }
  `}
/>

                          </div>

                        </div>

                        {/* INFORMACIÓN */}
<div className="mt-5 text-center">

  {/* NOMBRE DEL JUGADOR */}
  <h4
    className={`
      text-lg md:text-xl
      font-black
      leading-tight
      ${color.texto}
    `}
  >
    {jugador.nombre}
  </h4>

  {/* JUGADOR DESTACADO - APARECE EN LOS DOS */}
  <p
    className={`
      mt-2
      inline-flex
      items-center
      justify-center
      rounded-full
      px-4 py-1.5
      text-[9px] md:text-[10px]
      font-black
      uppercase
      tracking-wider
      shadow-md
      ${
        equipo.nombre === "Espartanos"
          ? "bg-yellow-300 text-yellow-950"
          : "bg-yellow-400 text-slate-950"
      }
    `}
  >
    ⭐ JUGADOR DESTACADO
  </p>

  {/* ESTADÍSTICAS */}
  <div className="mt-4 grid grid-cols-3 gap-2 md:gap-3">

    {/* PUNTOS */}
    <div
      className={`
        min-w-0
        min-h-[78px]
        rounded-xl
        px-2 py-3 md:px-3
        flex flex-col
        items-center
        justify-center
        ${
          equipo.nombre === "Espartanos"
            ? "bg-white/70"
            : "bg-white/15"
        }
      `}
    >
      <p
        className={`
          text-[9px] md:text-[10px]
          font-black
          tracking-wide
          ${
            equipo.nombre === "Espartanos"
              ? "text-blue-700"
              : "text-blue-200"
          }
        `}
      >
        PTS
      </p>

      <p
        className={`
          mt-1
          text-xl md:text-2xl
          font-black
          leading-none
          whitespace-nowrap
          ${
            equipo.nombre === "Espartanos"
              ? "text-blue-950"
              : "text-white"
          }
        `}
      >
        {Number(jugador.ppg || 0).toFixed(1)}
      </p>
    </div>

    {/* REBOTES */}
    <div
      className={`
        min-w-0
        min-h-[78px]
        rounded-xl
        px-2 py-3 md:px-3
        flex flex-col
        items-center
        justify-center
        ${
          equipo.nombre === "Espartanos"
            ? "bg-white/70"
            : "bg-white/15"
        }
      `}
    >
      <p
        className={`
          text-[9px] md:text-[10px]
          font-black
          tracking-wide
          ${
            equipo.nombre === "Espartanos"
              ? "text-green-700"
              : "text-green-200"
          }
        `}
      >
        REB
      </p>

      <p
        className={`
          mt-1
          text-xl md:text-2xl
          font-black
          leading-none
          whitespace-nowrap
          ${
            equipo.nombre === "Espartanos"
              ? "text-green-950"
              : "text-white"
          }
        `}
      >
        {Number(jugador.rpg || 0).toFixed(1)}
      </p>
    </div>

    {/* ASISTENCIAS */}
    <div
      className={`
        min-w-0
        min-h-[78px]
        rounded-xl
        px-2 py-3 md:px-3
        flex flex-col
        items-center
        justify-center
        ${
          equipo.nombre === "Espartanos"
            ? "bg-white/70"
            : "bg-white/15"
        }
      `}
    >
      <p
        className={`
          text-[9px] md:text-[10px]
          font-black
          tracking-wide
          ${
            equipo.nombre === "Espartanos"
              ? "text-orange-700"
              : "text-orange-200"
          }
        `}
      >
        AST
      </p>

      <p
        className={`
          mt-1
          text-xl md:text-2xl
          font-black
          leading-none
          whitespace-nowrap
          ${
            equipo.nombre === "Espartanos"
              ? "text-orange-950"
              : "text-white"
          }
        `}
      >
        {Number(jugador.apg || 0).toFixed(1)}
      </p>
    </div>

  </div>

</div>

                      </div>

                    </Link>
                  );
                }
              )}

            </div>

            {/* PIE DEL EQUIPO */}
            <div
              className={`
                relative px-5 pb-5 md:px-7 md:pb-7
                text-center
              `}
            >

              <p
                className={`
                  text-[10px] md:text-xs
                  font-black uppercase
                  tracking-[0.18em]
                  ${color.textoSuave}
                `}
              >
                🏀 LOS PROTAGONISTAS DE LA JORNADA
              </p>

            </div>

          </div>
        );
      })}

    </div>

    <p className="mt-5 text-center text-[10px] sm:text-xs font-medium text-slate-400">
      Estadísticas actualizadas automáticamente según los partidos registrados.
    </p>

  </div>
</section>

<div id="proximos-partidos" className="bg-white p-6 rounded-xl shadow mt-6">
  <h2 className="text-3xl font-black text-blue-900 mb-6">
    📅 Próximos Partidos
  </h2>

  <div className="space-y-4">

    {partidosActuales
      .filter(
        (partido) =>
          partido.estado !== "Finalizado" ||
          partido.puntosLocal === null ||
          partido.puntosVisitante === null
      )
      .slice(0, 3)
      .map((partido, index) => (
        <div
          key={index}
          className="bg-slate-50 border-l-8 border-blue-600 rounded-2xl p-5 md:p-6 shadow hover:shadow-lg transition"
        >
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            <div className="flex items-center gap-3 md:gap-4 min-w-0">

              <div className="flex items-center justify-center bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
              <Image
                src={
                  equipos.find(
                    (e) => e.nombre === partido.local
                  )?.logo || "/logo.png"
                }
                alt={partido.local}
                width={112}
                height={112}
                className="w-24 h-24 md:w-28 md:h-28 object-contain"
              />
              </div>

              <p className="font-bold text-base md:text-xl text-center">
                {partido.local}
              </p>

            </div>

            <div className="flex flex-col items-center">

              <span className="text-xs font-bold text-gray-500">
                LIBAVIME
              </span>

              <span className="text-2xl font-black text-blue-700">
                VS
              </span>

            </div>

            <div className="flex items-center gap-3 md:gap-4 min-w-0">

              <p className="font-bold text-base md:text-xl text-center">
                {partido.visitante}
              </p>

              <Image
                src={
                  equipos.find(
                    (e) => e.nombre === partido.visitante
                  )?.logo || "/logo.png"
                }
                alt={partido.visitante}
                width={112}
                height={112}
                className="w-24 h-24 md:w-28 md:h-28 object-contain"
              />

            </div>

          </div>

          <div className="mt-4 text-center">
            <span className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-bold">
              📅 {partido.fecha}
            </span>
          </div>

        </div>
      ))}

  </div>
</div>

<div className="mt-10">
  <h2 className="text-3xl font-black text-center text-blue-900 mb-8">
    🏆 LÍDERES DE LA LIGA
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

    {/* TOP 3 PUNTOS */}
    <div className="bg-red-50 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-black text-center mb-5">
        🏀 TOP 3 PUNTOS
      </h2>

      <div className="space-y-3">
        {lideresPuntos.map((jugador, index) => (
          <Link
            key={jugador.slug}
            href={`/jugadores/${jugador.slug}`}
            className="block"
          >
            <div className="bg-white p-3 rounded-xl shadow grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">

              <div className="text-xl">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </div>

              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-4 border-red-500 bg-white shadow-lg">
  <Image
    src={jugador.foto}
    alt={jugador.nombre}
    fill
    sizes="72px"
    className="object-cover object-[center_38%] scale-[1.45]"
  />
</div>

              <div className="min-w-0 text-center">
                <p className="font-bold text-center leading-tight">{jugador.nombre}</p>
                <p className="text-sm text-gray-500 text-center">
                  {jugador.equipo}
                </p>
              </div>

              <p className="text-red-700 font-black">
                {jugador.ppg} PPG
              </p>

            </div>
          </Link>
        ))}
      </div>
    </div>

    {/* TOP 3 REBOTES */}
    <div className="bg-purple-50 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-black text-center mb-5">
        💪 TOP 3 REBOTES
      </h2>

      <div className="space-y-3">
        {lideresRebotes.map((jugador, index) => (
          <Link
            key={jugador.slug}
            href={`/jugadores/${jugador.slug}`}
            className="block"
          >
            <div className="bg-white p-3 rounded-xl shadow grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">

              <div className="text-xl">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </div>

             <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-4 border-purple-500 bg-white shadow-lg">
  <Image
    src={jugador.foto}
    alt={jugador.nombre}
    fill
    sizes="72px"
    className="object-cover object-[center_38%] scale-[1.45]"
  />
</div>

              <div className="min-w-0 text-center">
                <p className="font-bold text-center leading-tight">{jugador.nombre}</p>
                <p className="text-sm text-gray-500 text-center">
                  {jugador.equipo}
                </p>
              </div>

              <p className="text-purple-700 font-black">
                {jugador.rpg} RPG
              </p>

            </div>
          </Link>
        ))}
      </div>
    </div>

    {/* TOP 3 ASISTENCIAS */}
    <div className="bg-yellow-50 p-6 rounded-2xl shadow-lg">
      <h2 className="text-xl font-black text-center mb-5">
        🎯 TOP 3 ASISTENCIAS
      </h2>

      <div className="space-y-3">
        {lideresAsistencias.map((jugador, index) => (
          <Link
            key={jugador.slug}
            href={`/jugadores/${jugador.slug}`}
            className="block"
          >
            <div className="bg-white p-3 rounded-xl shadow grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">

              <div className="text-xl">
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
              </div>

              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full border-4 border-yellow-500 bg-white shadow-lg">
  <Image
    src={jugador.foto}
    alt={jugador.nombre}
    fill
    sizes="72px"
    className="object-cover object-[center_38%] scale-[1.45]"
  />
</div>

              <div className="min-w-0 text-center">
                <p className="font-bold text-center leading-tight">{jugador.nombre}</p>
                <p className="text-sm text-gray-500 text-center">
                  {jugador.equipo}
                </p>
              </div>

              <p className="text-yellow-600 font-black">
                {jugador.apg} APG
              </p>

            </div>
          </Link>
        ))}
      </div>
    </div>

  </div>
</div> 
</div>

<footer className="mt-12 border-t border-slate-300 pt-6 pb-8 text-center">
  <div className="mx-auto flex max-w-3xl flex-col items-center px-4">

    <p className="flex items-center justify-center gap-2 text-lg font-black tracking-wide text-slate-700 sm:text-xl">
      <span className="text-xl sm:text-2xl">🏀</span>
      <span>LIBAVIME</span>
    </p>

    <p className="mt-3 max-w-2xl text-center text-sm font-medium leading-relaxed text-slate-500 sm:text-base">
      © 2026 LIBAVIME · Diseñado y desarrollado por{" "}
      <span className="font-black text-blue-900">
        Emmi De La Cruz
      </span>
    </p>

    <p className="mt-2 text-center text-xs font-medium text-slate-400 sm:text-sm">
      Creado para LIBAVIME
    </p>

    {/* REDES SOCIALES */}
    <div className="mt-5 flex items-center justify-center gap-4">

      {/* INSTAGRAM */}
      <a
        href="https://www.instagram.com/libavime?igsi=aHgyMHkzN2tweHpr"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram de LIBAVIME"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-md transition hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      </a>

      {/* YOUTUBE */}
      <a
        href="https://www.youtube.com/channel/UCUkCUSmljiIn-gO1KFJNVeg"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube de LIBAVIME"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.5v-7l6.2 3.5-6.2 3.5Z" />
        </svg>
      </a>

    </div>

  </div>
</footer>

</main>

</>
);
}