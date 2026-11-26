/* eslint-disable @next/next/no-img-element -- html-to-image necesita <img> simples para exportar */
import {
  MEJOR_DE,
  colorEquipo,
  formatearCancha,
  logoEquipo,
  partesFecha,
  type SerieFinal,
} from "@/lib/finales";

type Formato = "historia" | "post";

/**
 * Plantilla "Ruta a la final" (calendario de la serie final) para el
 * editor de Instagram. Se dibuja sobre un lienzo de 360 px de ancho que
 * se exporta a 1080 × 1350 (post) o 1080 × 1920 (historia).
 */
export default function RutaFinal({
  serie,
  formato,
  equipos,
}: {
  serie: SerieFinal | null;
  formato: Formato;
  equipos?: { nombre: string; logo?: string | null; color?: string | null }[];
}) {
  const post = formato === "post";

  if (!serie) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center text-center text-sm font-bold text-slate-300">
        No hay partidos de finales registrados.
      </div>
    );
  }

  const [izquierda, derecha] = serie.equipos;
  const { campeon, proximo } = serie;

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center">
      {/* Luces de los equipos */}
      <div
        className="pointer-events-none absolute -inset-x-4 inset-y-0"
        style={{
          background: `
            radial-gradient(circle at 0% 22%, ${colorEquipo(izquierda, equipos)}40, transparent 38%),
            radial-gradient(circle at 100% 22%, ${colorEquipo(derecha, equipos)}40, transparent 38%)
          `,
        }}
      />

      <p className={`relative mt-1 font-black tracking-[0.26em] text-amber-300 ${post ? "text-[7px]" : "text-[9px]"}`}>
        SERIE FINAL · AL MEJOR DE {MEJOR_DE}
      </p>
      <h2
        className={`relative mt-0.5 text-center font-black uppercase italic leading-none tracking-tight text-white ${
          post ? "text-[26px]" : "text-[38px]"
        }`}
        style={{ textShadow: "0 3px 0 #b45309, 0 0 24px rgba(251,191,36,0.45)" }}
      >
        Ruta a la Final
      </h2>

      {/* Enfrentamiento y marcador de la serie */}
      <div className={`relative grid w-full grid-cols-[1fr_auto_1fr] items-center ${post ? "mt-1.5" : "mt-4"}`}>
        {[izquierda, derecha].map((equipo, indice) => (
          <div
            key={equipo}
            className={`flex flex-col items-center ${indice === 1 ? "order-3" : ""}`}
          >
            <div
              className={`overflow-hidden rounded-full bg-black/30 ${
                post ? "h-[50px] w-[50px]" : "h-[80px] w-[80px]"
              }`}
              style={{ boxShadow: `0 0 22px ${colorEquipo(equipo, equipos)}80, inset 0 0 0 2px ${colorEquipo(equipo, equipos)}` }}
            >
              <img src={logoEquipo(equipo, equipos)} alt={equipo} className="h-full w-full object-cover" />
            </div>
            <p
              className={`mt-1 font-black uppercase tracking-wider ${post ? "text-[9px]" : "text-[12px]"}`}
              style={{ color: colorEquipo(equipo, equipos) }}
            >
              {equipo}
              {campeon === equipo ? " 👑" : ""}
            </p>
          </div>
        ))}

        <div className="order-2 flex flex-col items-center px-1">
          <div className={`flex items-center gap-1.5 font-black tabular-nums leading-none text-white ${post ? "text-[30px]" : "text-[50px]"}`}>
            <span>{serie.victorias[izquierda]}</span>
            <span className={`text-amber-300 ${post ? "text-[18px]" : "text-[26px]"}`}>—</span>
            <span>{serie.victorias[derecha]}</span>
          </div>
          <p className={`mt-0.5 font-black tracking-[0.22em] text-slate-300 ${post ? "text-[6px]" : "text-[8px]"}`}>
            SERIE
          </p>
        </div>
      </div>

      {/* Calendario: panel central destacado */}
      <div className={`relative flex w-full flex-1 flex-col justify-center ${post ? "py-1.5" : "py-3"}`}>
        <div
          className={`w-full rounded-2xl border-2 border-amber-300/80 bg-[#030712]/85 ${post ? "px-2 pb-2 pt-1.5" : "px-3 pb-3 pt-2.5"}`}
          style={{ boxShadow: "0 0 28px rgba(251,191,36,0.35), inset 0 0 22px rgba(251,191,36,0.10)" }}
        >
          <div className={`flex items-center justify-center gap-2 ${post ? "mb-1.5" : "mb-3"}`}>
            <span className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-amber-300" />
            <p className={`font-black uppercase tracking-[0.22em] text-amber-300 ${post ? "text-[9px]" : "text-[13px]"}`}>
              📅 Calendario de la serie
            </p>
            <span className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-amber-300" />
          </div>

          <ol className={post ? "space-y-1.5" : "space-y-2.5"}>
            {serie.juegos.map((juego) => {
              const partes = juego.inicio ? partesFecha(juego.inicio) : null;
              const esProximo = proximo?.id === juego.id;
              const destacado = esProximo && serie.decisivo;

              return (
                <li
                  key={juego.id}
                  className={`flex items-stretch overflow-hidden rounded-xl border-2 ${
                    esProximo
                      ? "border-amber-300 bg-gradient-to-r from-amber-500/35 via-[#0b1730] to-amber-500/35"
                      : "border-white/20 bg-[#0b1730]"
                  }`}
                  style={esProximo ? { boxShadow: "0 0 20px rgba(251,191,36,0.55)" } : undefined}
                >
                  {/* Fecha */}
                  <div
                    className={`flex shrink-0 flex-col items-center justify-center font-black leading-none ${
                      esProximo ? "bg-amber-400 text-slate-950" : "bg-white/15 text-white"
                    } ${post ? "w-[50px] py-1.5" : "w-[64px] py-3"}`}
                  >
                    <span className={post ? "text-[8px]" : "text-[11px]"}>
                      {partes?.diaSemana.slice(0, 3).toUpperCase()}
                    </span>
                    <span className={post ? "text-[21px]" : "text-[28px]"}>{partes?.dia}</span>
                    <span className={post ? "text-[8px]" : "text-[11px]"}>
                      {partes?.mes.slice(0, 3).toUpperCase()}
                    </span>
                  </div>

                  {/* Detalle */}
                  <div className={`flex min-w-0 flex-1 flex-col justify-center ${post ? "px-2 py-1" : "px-3 py-2"}`}>
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-black tracking-[0.18em] ${esProximo ? "text-amber-300" : "text-slate-300"} ${
                          post ? "text-[8px]" : "text-[11px]"
                        }`}
                      >
                        JUEGO {juego.numero}
                      </span>
                      {juego.finalizado ? (
                        <span
                          className={`rounded px-1 font-black text-white ${post ? "text-[7px]" : "text-[9px]"}`}
                          style={{ backgroundColor: `${colorEquipo(juego.ganador ?? "", equipos)}99` }}
                        >
                          FINAL
                        </span>
                      ) : esProximo ? (
                        <span className={`rounded bg-red-600 px-1 font-black text-white ${post ? "text-[7px]" : "text-[9px]"}`}>
                          {destacado ? "¡DECISIVO!" : "PRÓXIMO"}
                        </span>
                      ) : null}
                    </div>

                    {juego.finalizado ? (
                      <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 font-black ${post ? "mt-0.5 text-[13px]" : "mt-1 text-[14.5px]"}`}>
                        {[
                          [juego.local, juego.puntosLocal],
                          [juego.visitante, juego.puntosVisitante],
                        ].flatMap(([equipo, puntos], i) => {
                          const gano = juego.ganador === equipo;
                          const lado = (
                            <span key={i} className={`flex items-center gap-1 ${i === 1 ? "flex-row-reverse" : ""}`}>
                              <span className={gano ? "text-white" : "text-slate-400"}>{String(equipo)}</span>
                              <span
                                className="tabular-nums"
                                style={{ color: gano ? colorEquipo(String(equipo), equipos) : "#94a3b8" }}
                              >
                                {puntos}
                              </span>
                            </span>
                          );
                          return i === 0
                            ? [lado, <span key="sep" className="text-amber-300/80">–</span>]
                            : [lado];
                        })}
                      </div>
                    ) : (
                      <>
                        <p className={`font-black text-white ${post ? "mt-0.5 text-[13px]" : "mt-1 text-[16px]"}`}>
                          {juego.local} <span className="text-amber-300">vs</span> {juego.visitante}
                        </p>
                        <p className={`font-bold text-slate-100 ${post ? "text-[9px]" : "text-[12px]"}`}>
                          🕓 {partes?.hora}
                          {juego.cancha ? ` · 📍 ${formatearCancha(juego.cancha)}` : ""}
                        </p>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Cierre */}
      <div className={`relative w-full text-center ${post ? "pb-0.5" : "pb-4"}`}>
        <div
          className={`mx-auto inline-block rounded-lg font-black uppercase tracking-[0.18em] ${
            campeon ? "bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950" : "bg-red-600 text-white"
          } ${post ? "px-3 py-1 text-[9px]" : "px-4 py-2 text-[13px]"}`}
        >
          {campeon
            ? `🏆 ${campeon} campeón 2026`
            : serie.decisivo
              ? `Todo se decide en el Juego ${proximo?.numero ?? ""}`
              : "¡No te lo pierdas!"}
        </div>
      </div>
    </div>
  );
}
