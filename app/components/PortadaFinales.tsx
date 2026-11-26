"use client";

import Image from "next/image";
import Link from "next/link";
import {
  MEJOR_DE,
  colorEquipo,
  construirSerieFinal,
  formatearCancha,
  logoEquipo,
  partesFecha,
  type PartidoFinalEntrada,
} from "@/lib/finales";

// Duración aproximada de un partido para mostrar "En juego".
const DURACION_PARTIDO_MS = 2.5 * 60 * 60 * 1000;

function cuentaRegresiva(objetivo: Date, ahora: Date) {
  const restante = Math.max(0, objetivo.getTime() - ahora.getTime());
  return {
    dias: Math.floor(restante / 86_400_000),
    horas: Math.floor(restante / 3_600_000) % 24,
    minutos: Math.floor(restante / 60_000) % 60,
    segundos: Math.floor(restante / 1000) % 60,
  };
}

export default function PortadaFinales({
  partidos,
  ahora,
}: {
  partidos: (PartidoFinalEntrada & { fase?: string | null })[];
  ahora: Date;
}) {
  const serie = construirSerieFinal(
    partidos.filter((p) => String(p.fase ?? "").trim().toLowerCase() === "finales")
  );

  if (!serie) return null;

  const [izquierda, derecha] = serie.equipos;
  const { proximo, campeon } = serie;
  const inicioProximo = proximo?.inicio ?? null;
  const enJuego =
    !!inicioProximo &&
    ahora >= inicioProximo &&
    ahora.getTime() - inicioProximo.getTime() < DURACION_PARTIDO_MS;
  const tiempo = inicioProximo ? cuentaRegresiva(inicioProximo, ahora) : null;
  const fechaProximo = inicioProximo ? partesFecha(inicioProximo) : null;

  const etiquetaEstado = campeon
    ? `🏆 ${campeon.toUpperCase()} CAMPEÓN 2026`
    : proximo
      ? `JUEGO ${proximo.numero}${serie.decisivo ? " · DECISIVO" : ""}`
      : "SERIE FINAL";

  return (
    <section
      aria-labelledby="titulo-gran-final"
      className="relative mt-2 overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl ring-1 ring-amber-300/40 md:mt-8"
    >
      {/* Luces con los colores de cada equipo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 12% 30%, ${colorEquipo(izquierda)}55, transparent 42%),
            radial-gradient(circle at 88% 30%, ${colorEquipo(derecha)}55, transparent 42%),
            radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.25), transparent 55%),
            linear-gradient(180deg, #0b1730 0%, #020617 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 22px)",
        }}
      />

      <div className="relative px-4 py-7 sm:px-8 md:px-12 md:py-10">
        <div className="text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black tracking-[0.12em] text-amber-200 sm:px-4 sm:text-xs sm:tracking-[0.22em]">
            🏆 LIBAVIME 2026 · SERIE AL MEJOR DE {MEJOR_DE}
          </p>
          <h2
            id="titulo-gran-final"
            className="mt-4 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-4xl font-black uppercase italic leading-none tracking-tight text-transparent sm:text-6xl md:text-7xl"
          >
            La Gran Final
          </h2>
        </div>

        {/* Enfrentamiento */}
        <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-6">
          {[izquierda, derecha].map((equipo, indice) => (
            <div
              key={equipo}
              className={`flex flex-col items-center text-center ${indice === 1 ? "order-3" : ""}`}
            >
              <div
                className="relative h-20 w-20 rounded-full bg-white/5 sm:h-36 sm:w-36 md:h-44 md:w-44"
                style={{ boxShadow: `0 0 50px ${colorEquipo(equipo)}66, inset 0 0 0 3px ${colorEquipo(equipo)}` }}
              >
                <Image
                  src={logoEquipo(equipo)}
                  alt={equipo}
                  width={176}
                  height={176}
                  className="h-full w-full rounded-full object-cover"
                />
                {campeon === equipo && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl sm:text-4xl" aria-label="Campeón">
                    👑
                  </span>
                )}
              </div>
              <p
                className="mt-3 text-sm font-black uppercase sm:text-2xl sm:tracking-wider"
                style={{ color: colorEquipo(equipo) }}
              >
                {equipo}
              </p>
            </div>
          ))}

          <div className="order-2 flex flex-col items-center">
            <div className="flex items-center gap-2 font-black tabular-nums leading-none sm:gap-4">
              <span className="text-4xl sm:text-7xl md:text-8xl">{serie.victorias[izquierda]}</span>
              <span className="text-2xl text-amber-300 sm:text-4xl">—</span>
              <span className="text-4xl sm:text-7xl md:text-8xl">{serie.victorias[derecha]}</span>
            </div>
            <p className="mt-2 text-[10px] font-black tracking-[0.25em] text-slate-300 sm:text-xs">
              SERIE
            </p>
          </div>
        </div>

        {/* Estado del próximo juego o del campeón */}
        <div className="mt-7 text-center">
          <span
            className={`inline-block rounded-xl px-5 py-2 text-sm font-black tracking-[0.18em] shadow-lg sm:text-base ${
              campeon
                ? "bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950"
                : "bg-red-600 text-white"
            }`}
          >
            {enJuego ? "🔴 EN JUEGO AHORA" : etiquetaEstado}
          </span>

          {proximo && fechaProximo && (
            <div className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-2 text-sm font-bold sm:gap-3 sm:text-base">
              <span className="rounded-full bg-white/10 px-4 py-2">
                📅 {fechaProximo.diaSemana} {fechaProximo.dia} de {fechaProximo.mes}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2">🕓 {fechaProximo.hora}</span>
              {proximo.cancha && (
                <span className="rounded-full bg-white/10 px-4 py-2">
                  📍 {formatearCancha(proximo.cancha)}
                </span>
              )}
            </div>
          )}

          {tiempo && !enJuego && (
            <div className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-2 sm:gap-3">
              {[
                [tiempo.dias, "DÍAS"],
                [tiempo.horas, "HORAS"],
                [tiempo.minutos, "MIN"],
                [tiempo.segundos, "SEG"],
              ].map(([valor, texto]) => (
                <div
                  key={texto}
                  className="rounded-2xl border border-amber-300/30 bg-white/10 px-1 py-3 backdrop-blur"
                >
                  <div className="text-2xl font-black tabular-nums text-amber-300 sm:text-4xl">
                    {String(valor).padStart(2, "0")}
                  </div>
                  <div className="mt-1 text-[9px] font-black tracking-wider text-slate-300 sm:text-[11px]">
                    {texto}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Juego por juego */}
        <ol className="mt-8 grid gap-3 sm:grid-cols-3">
          {serie.juegos.map((juego) => {
            const partes = juego.inicio ? partesFecha(juego.inicio) : null;
            const esProximo = proximo?.id === juego.id;
            const contenido = (
              <>
                <div className="flex items-center justify-between text-[11px] font-black tracking-[0.18em]">
                  <span className={esProximo ? "text-amber-300" : "text-slate-400"}>
                    JUEGO {juego.numero}
                  </span>
                  <span className="text-slate-400">
                    {partes ? `${partes.dia} ${partes.mes.slice(0, 3).toUpperCase()}` : ""}
                  </span>
                </div>

                {[
                  [juego.local, juego.puntosLocal],
                  [juego.visitante, juego.puntosVisitante],
                ].map(([equipo, puntos]) => {
                  const gano = juego.ganador === equipo;
                  return (
                    <div key={String(equipo)} className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={`flex items-center gap-2 font-black ${
                          juego.finalizado && !gano ? "text-slate-400" : "text-white"
                        }`}
                      >
                        <Image src={logoEquipo(String(equipo))} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                        {String(equipo)}
                      </span>
                      <span
                        className={`text-xl font-black tabular-nums ${gano ? "" : "text-slate-400"}`}
                        style={gano ? { color: colorEquipo(String(equipo)) } : undefined}
                      >
                        {juego.finalizado ? puntos : ""}
                      </span>
                    </div>
                  );
                })}

                <p className="mt-3 text-xs font-bold text-slate-300">
                  {juego.finalizado
                    ? `Ganó ${juego.ganador ?? "—"} · Ver resultado →`
                    : esProximo
                      ? `${partes?.diaSemana ?? ""} · ${partes?.hora ?? ""}`
                      : "Pendiente"}
                </p>
              </>
            );

            const clase = `block h-full rounded-2xl border p-4 transition ${
              esProximo
                ? "border-amber-300 bg-amber-400/10 shadow-[0_0_30px_rgba(251,191,36,0.25)]"
                : "border-white/10 bg-white/5"
            }`;

            return (
              <li key={juego.id}>
                {juego.finalizado ? (
                  <Link href={`/resultados/${juego.id}`} className={`${clase} hover:bg-white/10`}>
                    {contenido}
                  </Link>
                ) : (
                  <div className={clase}>{contenido}</div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/calendario"
            className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-300"
          >
            📅 Ver calendario
          </Link>
          <Link
            href="/estadisticas"
            className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
          >
            📊 Estadísticas de la final
          </Link>
        </div>
      </div>
    </section>
  );
}
