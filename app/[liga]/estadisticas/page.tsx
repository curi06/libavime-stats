"use client";

import Navbar from "@/app/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLiga } from "@/app/components/LigaContext";

export default function Estadisticas() {
  const { liga, equipos, ruta, nombre: nombreLiga, temporada, logo: logoDeLiga } = useLiga();
  // Prefijo para nombres de archivos exportados (PDF / imágenes).
  const prefijoArchivo = `${nombreLiga}_${temporada}`.replace(/[^a-zA-Z0-9]+/g, "_");
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [faseSeleccionada, setFaseSeleccionada] = useState<"serie_regular" | "finales">("finales");

  // Abre en "Finales" solo si la liga ya jugó partidos de finales;
  // si no (temporada regular o liga nueva), en "Serie Regular".
  useEffect(() => {
    let activo = true;
    void supabase
      .from("partidos")
      .select("id", { count: "exact", head: true })
      .eq("liga_id", liga.id)
      .eq("fase", "finales")
      .eq("estado", "Finalizado")
      .then(({ count }) => {
        if (activo && !count) setFaseSeleccionada("serie_regular");
      });
    return () => {
      activo = false;
    };
  }, [liga.id]);
  const [vistaSeleccionada, setVistaSeleccionada] = useState<"estadisticas" | "destacados">("estadisticas");
  const [jornadasDestacados, setJornadasDestacados] = useState<any[]>([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState("");
  const [jugadorExportandoId, setJugadorExportandoId] = useState<string | null>(null);
  const tarjetasDestacadosRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(false);


  useEffect(() => {
    cargarDatos();
  }, [faseSeleccionada]);

  // El enlace al editor solo se muestra a usuarios con una sesión activa.
  // La protección real de la ruta se realiza además en el servidor.
  useEffect(() => {
    let activo = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (activo) setUsuarioAutenticado(Boolean(user));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, session) => {
      if (activo) setUsuarioAutenticado(Boolean(session?.user));
    });

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga("");

    try {
      await cargarJugadores();
    } catch (error) {
      console.error(
        "Error general cargando estadísticas:",
        error
      );

      setErrorCarga(
        "Ocurrió un error al cargar las estadísticas."
      );
    } finally {
      setCargando(false);
    }
  }

  async function cargarJugadores() {
    const [
      { data: jugadoresData, error: jugadoresError },
      { data: estadisticasData, error: estadisticasError },
      { data: partidosData, error: partidosError },
    ] = await Promise.all([
      supabase
        .from("jugadores")
        .select("*")
      .eq("liga_id", liga.id)
        .order("nombre"),

      supabase
  .from("estadisticas_partido")
  .select(`
    jugador_id,
    partido_id,
    puntos,
    rebotes,
    asistencias,
    estado
  `)
      .eq("liga_id", liga.id),

      supabase
        .from("partidos")
        .select("*")
      .eq("liga_id", liga.id)
        .eq("estado", "Finalizado")
        .eq("fase", faseSeleccionada),
    ]);

    if (jugadoresError) {
      console.error("Error cargando jugadores:", jugadoresError);
      return;
    }

    if (estadisticasError) {
      console.error("Error cargando estadísticas por partido:", estadisticasError);
      return;
    }

    if (partidosError) {
      console.error("Error cargando partidos:", partidosError);
      return;
    }

    const partidosFinalizados = new Set(
      (partidosData ?? []).map((partido: any) => Number(partido.id))
    );

    // ============================================================
    // ESTADÍSTICAS OFICIALES
    // Se calculan directamente partido por partido.
    //
    // PTS = suma de puntos de todos los partidos finalizados
    // REB = suma de rebotes de todos los partidos finalizados
    // AST = suma de asistencias de todos los partidos finalizados
    // JJ  = cantidad de partidos finalizados con registro estadístico
    //
    // Luego:
    // PPG = PTS / JJ
    // RPG = REB / JJ
    // APG = AST / JJ
    // ============================================================

    const acumuladosPorJugador = new Map<
      number,
      {
        partidos: Set<number>;
        puntos: number;
        rebotes: number;
        asistencias: number;
      }
    >();

    (estadisticasData ?? []).forEach((registro: any) => {
  const jugadorId = Number(registro.jugador_id);
  const partidoId = Number(registro.partido_id);

  // Solo cuentan partidos oficialmente finalizados.
  if (!partidosFinalizados.has(partidoId)) return;

  // ============================================================
  // ESTADO DEL JUGADOR
  //
  // 🟢 jugó       → cuenta como JJ y suma estadísticas
  // ⚪ no_jugo     → NO cuenta como JJ
  // 🔴 lesionado   → NO cuenta como JJ
  //
  // El valor por defecto "jugó" mantiene compatibles
  // los registros históricos.
  // ============================================================

  const estado =
    registro.estado === "no_jugo" ||
    registro.estado === "lesionado"
      ? registro.estado
      : "jugó";

  // Si no jugó o estuvo lesionado, ignoramos completamente
  // este registro para las estadísticas oficiales.
  if (estado !== "jugó") return;

  if (!acumuladosPorJugador.has(jugadorId)) {
    acumuladosPorJugador.set(jugadorId, {
      partidos: new Set<number>(),
      puntos: 0,
      rebotes: 0,
      asistencias: 0,
    });
  }

  const acumulado = acumuladosPorJugador.get(jugadorId)!;

  // El jugador SÍ participó en este partido.
  // Por eso cuenta como 1 JJ, aunque haya terminado con 0.
  acumulado.partidos.add(partidoId);

  acumulado.puntos += Number(registro.puntos) || 0;
  acumulado.rebotes += Number(registro.rebotes) || 0;
  acumulado.asistencias += Number(registro.asistencias) || 0;
});

    const jugadoresConEstadisticas =
      (jugadoresData ?? []).filter((jugador: any) => acumuladosPorJugador.has(Number(jugador.id))).map((jugador: any) => {
        const acumulado = acumuladosPorJugador.get(Number(jugador.id));

        const partidosJugados = acumulado?.partidos.size ?? 0;
        const puntosTotales = acumulado?.puntos ?? 0;
        const rebotesTotales = acumulado?.rebotes ?? 0;
        const asistenciasTotales = acumulado?.asistencias ?? 0;

        return {
          ...jugador,

          puntosTotales,
          rebotesTotales,
          asistenciasTotales,

          partidosJugados,

          ppg:
            partidosJugados > 0
              ? Number((puntosTotales / partidosJugados).toFixed(1))
              : 0,

          rpg:
            partidosJugados > 0
              ? Number((rebotesTotales / partidosJugados).toFixed(1))
              : 0,

          apg:
            partidosJugados > 0
              ? Number((asistenciasTotales / partidosJugados).toFixed(1))
              : 0,
        };
      });


    // ============================================================
    // DESTACADOS AGRUPADOS POR JORNADA (FECHA DEL PARTIDO)
    // La tabla partidos no contiene un número de jornada; por eso
    // cada fecha de juego se agrupa como una jornada dentro de la fase.
    // ============================================================
    const normalizarEquipo = (valor: unknown) =>
      String(valor ?? "")
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .trim()
        .toLowerCase();

    const jugadoresPorId = new Map(
      (jugadoresData ?? []).map((jugador: any) => [String(jugador.id), jugador])
    );

    const estadisticasPorPartido = new Map<string, any[]>();
    (estadisticasData ?? []).forEach((registro: any) => {
      const id = String(registro.partido_id);
      const actuales = estadisticasPorPartido.get(id) ?? [];
      actuales.push(registro);
      estadisticasPorPartido.set(id, actuales);
    });

    const gruposPorFecha = new Map<string, any>();

    (partidosData ?? []).forEach((partido: any) => {
      const fecha = String(partido.fecha ?? "").slice(0, 10);
      if (!fecha) return;

      if (!gruposPorFecha.has(fecha)) {
        gruposPorFecha.set(fecha, {
          fecha,
          partidos: [],
          equiposParticipantes: new Set<string>(),
          jugadores: new Map<string, any>(),
        });
      }

      const grupo = gruposPorFecha.get(fecha);
      grupo.partidos.push(partido);
      [partido.equipo_local, partido.equipo_visitante].forEach((nombre) => {
        if (nombre) grupo.equiposParticipantes.add(normalizarEquipo(nombre));
      });

      (estadisticasPorPartido.get(String(partido.id)) ?? []).forEach((registro: any) => {
        if (registro.estado === "no_jugo" || registro.estado === "lesionado") return;

        const jugador = jugadoresPorId.get(String(registro.jugador_id));
        if (!jugador) return;

        const idJugador = String(jugador.id);
        if (!grupo.jugadores.has(idJugador)) {
          grupo.jugadores.set(idJugador, {
            ...jugador,
            puntosPartido: 0,
            rebotesPartido: 0,
            asistenciasPartido: 0,
          });
        }

        const acumulado = grupo.jugadores.get(idJugador);
        acumulado.puntosPartido += Number(registro.puntos) || 0;
        acumulado.rebotesPartido += Number(registro.rebotes) || 0;
        acumulado.asistenciasPartido += Number(registro.asistencias) || 0;
      });
    });

    const jornadasCronologicas = Array.from(gruposPorFecha.values()).sort(
      (a, b) => a.fecha.localeCompare(b.fecha)
    );

    const jornadasCalculadas = jornadasCronologicas.map((grupo, index) => ({
      fecha: grupo.fecha,
      numero: index + 1,
      partidos: grupo.partidos,
      cruces: grupo.partidos.map(
        (partido: any) => `${partido.equipo_local} vs ${partido.equipo_visitante}`
      ),
      equipos: equipos
        .filter((equipo) =>
          grupo.equiposParticipantes.has(normalizarEquipo(equipo.nombre))
        )
        .map((equipo) => ({
          ...equipo,
          jugadoresDestacados: Array.from(grupo.jugadores.values())
            .filter(
              (jugador: any) =>
                normalizarEquipo(jugador.equipo) === normalizarEquipo(equipo.nombre) &&
                Number(jugador.puntosPartido) > 0
            )
            .sort(
              (a: any, b: any) =>
                Number(b.puntosPartido) - Number(a.puntosPartido) ||
                Number(b.rebotesPartido) - Number(a.rebotesPartido) ||
                Number(b.asistenciasPartido) - Number(a.asistenciasPartido)
            )
            .slice(0, 2),
        }))
        .filter((equipo) => equipo.jugadoresDestacados.length > 0),
    }));

    // Presentamos primero la jornada más reciente, conservando su número cronológico.
    setJornadasDestacados([...jornadasCalculadas].reverse());
    setJornadaSeleccionada(jornadasCalculadas[jornadasCalculadas.length - 1]?.fecha ?? "");

    setJugadores(jugadoresConEstadisticas);
  }

  // ============================================================
  // RANKING GENERAL
  // Los lideratos se ordenan por TOTALES acumulados, no por promedio.
  // ============================================================

  const jugadoresOrdenados = [...jugadores].sort((a, b) => {
    const puntos = Number(b.puntosTotales ?? 0) - Number(a.puntosTotales ?? 0);

    if (puntos !== 0) return puntos;

    const rebotes =
      Number(b.rebotesTotales ?? 0) - Number(a.rebotesTotales ?? 0);

    if (rebotes !== 0) return rebotes;

    const asistencias =
      Number(b.asistenciasTotales ?? 0) -
      Number(a.asistenciasTotales ?? 0);

    if (asistencias !== 0) return asistencias;

    return String(a.nombre ?? "").localeCompare(
      String(b.nombre ?? "")
    );
  });

  // ==========================================
  // LIDERATOS COMPLETOS DE LA LIGA
  // CRITERIO: TOTAL ACUMULADO
  // ==========================================

  const rankingPuntos = [...jugadores].sort((a, b) => {
    const diferencia =
      Number(b.puntosTotales ?? 0) - Number(a.puntosTotales ?? 0);

    if (diferencia !== 0) return diferencia;

    const jj =
      Number(b.partidosJugados ?? 0) -
      Number(a.partidosJugados ?? 0);

    if (jj !== 0) return jj;

    return String(a.nombre ?? "").localeCompare(
      String(b.nombre ?? "")
    );
  });

  const rankingRebotes = [...jugadores].sort((a, b) => {
    const diferencia =
      Number(b.rebotesTotales ?? 0) - Number(a.rebotesTotales ?? 0);

    if (diferencia !== 0) return diferencia;

    const jj =
      Number(b.partidosJugados ?? 0) -
      Number(a.partidosJugados ?? 0);

    if (jj !== 0) return jj;

    return String(a.nombre ?? "").localeCompare(
      String(b.nombre ?? "")
    );
  });

  const rankingAsistencias = [...jugadores].sort((a, b) => {
    const diferencia =
      Number(b.asistenciasTotales ?? 0) -
      Number(a.asistenciasTotales ?? 0);

    if (diferencia !== 0) return diferencia;

    const jj =
      Number(b.partidosJugados ?? 0) -
      Number(a.partidosJugados ?? 0);

    if (jj !== 0) return jj;

    return String(a.nombre ?? "").localeCompare(
      String(b.nombre ?? "")
    );
  });

  const jornadaActual =
    jornadasDestacados.find((jornada) => jornada.fecha === jornadaSeleccionada) ??
    jornadasDestacados[0] ??
    null;

  async function exportarLideratosPDF() {
    try {
      if (jugadores.length === 0) {
        alert("No hay jugadores disponibles para exportar los lideratos.");
        return;
      }

      const jspdfModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");

      const jsPDF = jspdfModule.default;
      const autoTable =
        (autoTableModule.default || autoTableModule) as any;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const fecha = new Date().toLocaleDateString("es-DO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      let logoData: string | null = null;

      try {
        const respuesta = await fetch(logoDeLiga);

        if (respuesta.ok) {
          const blob = await respuesta.blob();

          logoData = await new Promise<string>((resolve, reject) => {
            const lector = new FileReader();

            lector.onloadend = () => {
              if (typeof lector.result === "string") {
                resolve(lector.result);
              } else {
                reject(new Error("No se pudo convertir el logo"));
              }
            };

            lector.onerror = () => {
              reject(new Error("Error leyendo el logo"));
            };

            lector.readAsDataURL(blob);
          });
        }
      } catch (error) {
        console.error(`No se pudo cargar el logo de ${nombreLiga}:`, error);
      }

      const dibujarEncabezadoLideratos = (
        tituloPrincipal: string,
        subtitulo: string,
        paginaRanking: number,
        totalPaginasRanking: number
      ) => {
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFillColor(247, 249, 252);
        doc.rect(0, 0, pageWidth, 45, "F");

        if (logoData) {
          try {
            const propiedades = doc.getImageProperties(logoData);
            const altoLogo = 29;
            const anchoLogo =
              (propiedades.width * altoLogo) / propiedades.height;

            doc.addImage(
              logoData,
              "PNG",
              12,
              6,
              anchoLogo,
              altoLogo
            );
          } catch (error) {
            console.error(
              `No se pudo insertar el logo de ${nombreLiga} en el PDF:`,
              error
            );
          }
        }

        // TÍTULO PRINCIPAL GRANDE Y CLARO
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(20, 50, 100);
        doc.text("LIDERATOS DE LA LIGA", pageWidth / 2, 14, {
          align: "center",
        });

        doc.setFontSize(15);
        doc.text(tituloPrincipal, pageWidth / 2, 22, {
          align: "center",
        });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(75, 80, 90);
        doc.text(
          `${nombreLiga} · TORNEO ${temporada} · RANKING OFICIAL`,
          pageWidth / 2,
          29,
          { align: "center" }
        );

        doc.setFontSize(8.5);
        doc.text(subtitulo, pageWidth / 2, 35, {
          align: "center",
        });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(20, 50, 100);
        doc.text(
          `Clasificación ${paginaRanking} de ${totalPaginasRanking}`,
          pageWidth - 12,
          35,
          { align: "right" }
        );

        doc.setDrawColor(20, 50, 100);
        doc.setLineWidth(0.8);
        doc.line(12, 41, pageWidth - 12, 41);
      };

      const dibujarPieLideratos = (
        pagina: number,
        totalPaginas: number
      ) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setDrawColor(20, 50, 100);
        doc.setLineWidth(0.45);
        doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(90, 90, 90);
        doc.text(`Fecha de emisión: ${fecha}`, 12, pageHeight - 7);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 50, 100);
        doc.text(
          "Diseño y desarrollo: Emmi De La Cruz",
          pageWidth / 2,
          pageHeight - 7,
          { align: "center" }
        );

        doc.setFont("helvetica", "normal");
        doc.setTextColor(90, 90, 90);
        doc.text(
          `Página ${pagina} de ${totalPaginas}`,
          pageWidth - 12,
          pageHeight - 7,
          { align: "right" }
        );
      };

      const crearPaginaRanking = (
        lista: any[],
        campo: "puntosTotales" | "rebotesTotales" | "asistenciasTotales",
        titulo: string,
        subtitulo: string,
        inicio: number,
        fin: number,
        numeroPaginaRanking: number,
        totalPaginasRanking: number
      ) => {
        const filas = lista.slice(inicio, fin).map((jugador, index) => [
          String(inicio + index + 1),
          String(jugador.nombre ?? ""),
          String(jugador.equipo ?? "—"),
          String(jugador.partidosJugados ?? 0),
          Number(jugador[campo] ?? 0),
        ]);

        dibujarEncabezadoLideratos(
          titulo,
          subtitulo,
          numeroPaginaRanking,
          totalPaginasRanking
        );

        autoTable(doc, {
          startY: 49,
          head: [
            [
              "POSICIÓN",
              "JUGADOR",
              "EQUIPO",
              "JJ",
              campo === "puntosTotales"
                ? "PUNTOS TOTALES"
                : campo === "rebotesTotales"
                ? "REBOTES TOTALES"
                : "ASISTENCIAS TOTALES",
            ],
          ],
          body: filas,
          theme: "grid",
          tableWidth: 273,
          margin: {
            top: 49,
            right: 12,
            bottom: 18,
            left: 12,
          },
          styles: {
            fontSize: 10,
            cellPadding: 2.7,
            minCellHeight: 9,
            valign: "middle",
            lineColor: [195, 201, 210],
            lineWidth: 0.25,
            textColor: [45, 50, 60],
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [20, 50, 100],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            valign: "middle",
            fontSize: 9.5,
            cellPadding: 3,
          },
          alternateRowStyles: {
            fillColor: [247, 249, 252],
          },
          columnStyles: {
            0: {
              halign: "center",
              cellWidth: 25,
              fontStyle: "bold",
            },
            1: {
              cellWidth: 92,
              fontStyle: "bold",
            },
            2: {
              cellWidth: 62,
            },
            3: {
              halign: "center",
              cellWidth: 24,
            },
            4: {
              halign: "center",
              cellWidth: 70,
              fontStyle: "bold",
              fontSize: 11,
            },
          },
        });
      };

      // Cada liderato ocupa 2 páginas para que los renglones sean
      // grandes, claros y fáciles de leer. Son 44 jugadores: 22 + 22.
      const rankings = [
        {
          lista: rankingPuntos,
          campo: "puntosTotales" as const,
          titulo: "LÍDERES EN PUNTOS",
          subtitulo: "Puntos totales acumulados · Mayor a menor",
        },
        {
          lista: rankingRebotes,
          campo: "rebotesTotales" as const,
          titulo: "LÍDERES EN REBOTES",
          subtitulo: "Rebotes totales acumulados · Mayor a menor",
        },
        {
          lista: rankingAsistencias,
          campo: "asistenciasTotales" as const,
          titulo: "LÍDERES EN ASISTENCIAS",
          subtitulo: "Asistencias totales acumuladas · Mayor a menor",
        },
      ];

      rankings.forEach((ranking, rankingIndex) => {
        const totalPaginasRanking = 2;

        if (rankingIndex > 0) {
          doc.addPage();
        }

        crearPaginaRanking(
          ranking.lista,
          ranking.campo,
          ranking.titulo,
          ranking.subtitulo,
          0,
          22,
          1,
          totalPaginasRanking
        );

        doc.addPage();

        crearPaginaRanking(
          ranking.lista,
          ranking.campo,
          ranking.titulo,
          ranking.subtitulo,
          22,
          44,
          2,
          totalPaginasRanking
        );
      });

      const totalPaginas = doc.getNumberOfPages();

      for (let pagina = 1; pagina <= totalPaginas; pagina++) {
        doc.setPage(pagina);
        dibujarPieLideratos(pagina, totalPaginas);
      }

      doc.save(
        `Lideratos_${prefijoArchivo}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    } catch (error) {
      console.error("Error al generar el PDF de lideratos:", error);
      alert(
        "No se pudo generar el PDF de lideratos. Inténtalo nuevamente."
      );
    }
  }

  async function exportarPDF() {
    try {
      if (jugadoresOrdenados.length === 0) {
        alert(
          "No hay jugadores disponibles para exportar."
        );
        return;
      }

      const jspdfModule = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");

      const jsPDF = jspdfModule.default;
      const autoTable =
        (
          autoTableModule.default ||
          autoTableModule
        ) as any;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const fecha = new Date().toLocaleDateString(
        "es-DO",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );

      const jugadoresExportacion =
        jugadoresOrdenados.map((jugador, index) => ({
          ...jugador,
          posicion: index + 1,
        }));

      const obtenerLider = (
        campo: "puntosTotales" | "rebotesTotales" | "asistenciasTotales"
      ) => {
        const ordenados = [
          ...jugadoresExportacion,
        ].sort(
          (a, b) =>
            Number(b[campo] ?? 0) -
            Number(a[campo] ?? 0)
        );

        return ordenados[0] ?? null;
      };

      const liderPuntos =
        obtenerLider("puntosTotales");

      const liderRebotes =
        obtenerLider("rebotesTotales");

      const liderAsistencias =
        obtenerLider("asistenciasTotales");

      const maxPuntos = Math.max(
        ...jugadoresExportacion.map((jugador) =>
          Number(jugador.puntosTotales ?? 0)
        ),
        0
      );

      const maxRebotes = Math.max(
        ...jugadoresExportacion.map((jugador) =>
          Number(jugador.rebotesTotales ?? 0)
        ),
        0
      );

      const maxAsistencias = Math.max(
        ...jugadoresExportacion.map((jugador) =>
          Number(jugador.asistenciasTotales ?? 0)
        ),
        0
      );

      let logoData: string | null = null;

      try {
        const respuesta = await fetch(
          logoDeLiga
        );

        if (respuesta.ok) {
          const blob = await respuesta.blob();

          logoData = await new Promise<string>(
            (resolve, reject) => {
              const lector = new FileReader();

              lector.onloadend = () => {
                if (
                  typeof lector.result === "string"
                ) {
                  resolve(lector.result);
                } else {
                  reject(
                    new Error(
                      "No se pudo convertir el logo"
                    )
                  );
                }
              };

              lector.onerror = () => {
                reject(
                  new Error(
                    "Error leyendo el logo"
                  )
                );
              };

              lector.readAsDataURL(blob);
            }
          );
        }
      } catch (error) {
        console.error(
          `No se pudo cargar el logo de ${nombreLiga}:`,
          error
        );
      }

      const dibujarEncabezado = (
        subtitulo = ""
      ) => {
        const pageWidth =
          doc.internal.pageSize.getWidth();

        const centro = pageWidth / 2;

        // Primero se pinta el fondo del encabezado.
        // El logo se agrega DESPUÉS para que nunca quede tapado.
        doc.setFillColor(
          247,
          249,
          252
        );

        doc.rect(
          0,
          0,
          pageWidth,
          39,
          "F"
        );

        // Logo oficial LIBAVIME en la esquina superior izquierda.
        // Esta función se ejecuta en las 3 páginas del PDF.
        if (logoData) {
          try {
            const propiedades =
              doc.getImageProperties(logoData);

            const altoLogo = 28;

            const anchoLogo =
              (propiedades.width * altoLogo) /
              propiedades.height;

            doc.addImage(
              logoData,
              "PNG",
              12,
              5,
              anchoLogo,
              altoLogo
            );
          } catch (error) {
            console.error(
              `No se pudo insertar el logo de ${nombreLiga} en el PDF:`,
              error
            );
          }
        }

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setFontSize(18);

        doc.setTextColor(
          20,
          50,
          100
        );

        doc.text(
          "ESTADÍSTICAS OFICIALES DE JUGADORES",
          centro,
          16,
          {
            align: "center",
          }
        );

        doc.setFontSize(12);

        doc.text(
          "LIGA DE BALONCESTO DE VISITADORES MÉDICOS",
          centro,
          24,
          {
            align: "center",
          }
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(9.5);

        doc.setTextColor(
          90,
          90,
          90
        );

        doc.text(
          subtitulo ||
            `TORNEO ${temporada} · ${nombreLiga}`,
          centro,
          31,
          {
            align: "center",
          }
        );

        doc.setDrawColor(
          20,
          50,
          100
        );

        doc.setLineWidth(0.7);

        doc.line(
          12,
          39,
          pageWidth - 12,
          39
        );
      };

      const dibujarResumen = () => {
        const pageWidth =
          doc.internal.pageSize.getWidth();

        const margen = 12;
        const separacion = 4;
        const cantidad = 4;

        const anchoTotal =
          pageWidth -
          margen * 2 -
          separacion * (cantidad - 1);

        const anchoTarjeta =
          anchoTotal / cantidad;

        const y = 46;
        const alto = 20;

        const tarjetas = [
          {
            titulo: "LÍDER EN PUNTOS",
            valor: liderPuntos
              ? `${liderPuntos.nombre} · ${Number(
                  liderPuntos.puntosTotales ?? 0
                )} PTS`
              : "Sin datos",
            color: [188, 90, 42] as [
              number,
              number,
              number
            ],
          },
          {
            titulo: "LÍDER EN REBOTES",
            valor: liderRebotes
              ? `${liderRebotes.nombre} · ${Number(
                  liderRebotes.rebotesTotales ?? 0
                )} REB`
              : "Sin datos",
            color: [88, 110, 171] as [
              number,
              number,
              number
            ],
          },
          {
            titulo: "LÍDER EN ASISTENCIAS",
            valor: liderAsistencias
              ? `${liderAsistencias.nombre} · ${Number(
                  liderAsistencias.asistenciasTotales ?? 0
                )} AST`
              : "Sin datos",
            color: [161, 91, 31] as [
              number,
              number,
              number
            ],
          },
          {
            titulo: "JUGADORES REGISTRADOS",
            valor: `${jugadoresExportacion.length} jugadores`,
            color: [20, 50, 100] as [
              number,
              number,
              number
            ],
          },
        ];

        tarjetas.forEach(
          (tarjeta, index) => {
            const x =
              margen +
              index *
                (anchoTarjeta + separacion);

            doc.setFillColor(
              255,
              255,
              255
            );

            doc.setDrawColor(
              225,
              230,
              238
            );

            doc.roundedRect(
              x,
              y,
              anchoTarjeta,
              alto,
              2,
              2,
              "FD"
            );

            doc.setFillColor(
              ...tarjeta.color
            );

            doc.roundedRect(
              x,
              y,
              2.8,
              alto,
              2,
              2,
              "F"
            );

            doc.setFont(
              "helvetica",
              "bold"
            );

            doc.setFontSize(7.5);

            doc.setTextColor(
              100,
              100,
              100
            );

            doc.text(
              tarjeta.titulo,
              x + 6,
              y + 7
            );

            doc.setFontSize(9.5);

            doc.setTextColor(
              ...tarjeta.color
            );

            const valor =
              doc.splitTextToSize(
                tarjeta.valor,
                anchoTarjeta - 10
              );

            doc.text(
              valor,
              x + 6,
              y + 14
            );
          }
        );
      };

      const dibujarPie = (
        pagina: number,
        totalPaginas: number
      ) => {
        const pageWidth =
          doc.internal.pageSize.getWidth();

        const pageHeight =
          doc.internal.pageSize.getHeight();

        doc.setDrawColor(
          20,
          50,
          100
        );

        doc.setLineWidth(0.45);

        doc.line(
          12,
          pageHeight - 14,
          pageWidth - 12,
          pageHeight - 14
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setFontSize(7.5);

        doc.setTextColor(
          90,
          90,
          90
        );

        doc.text(
          `Fecha de emisión: ${fecha}`,
          12,
          pageHeight - 7
        );

        doc.setFont(
          "helvetica",
          "bold"
        );

        doc.setTextColor(
          20,
          50,
          100
        );

        doc.text(
          "Diseño y desarrollo: Emmi De La Cruz",
          pageWidth / 2,
          pageHeight - 7,
          {
            align: "center",
          }
        );

        doc.setFont(
          "helvetica",
          "normal"
        );

        doc.setTextColor(
          90,
          90,
          90
        );

        doc.text(
          `Página ${pagina} de ${totalPaginas}`,
          pageWidth - 12,
          pageHeight - 7,
          {
            align: "right",
          }
        );
      };

      const encabezados = [
        [
          "POS",
          "JUGADOR",
          "EQUIPO",
          "JJ",
          "PTS",
          "PPG",
          "REB",
          "RPG",
          "AST",
          "APG",
        ],
      ];

      const crearFilas = (
        lista: any[]
      ) =>
        lista.map((jugador) => [
          String(jugador.posicion),
          String(jugador.nombre ?? ""),
          String(jugador.equipo ?? ""),
          String(
            jugador.partidosJugados ?? 0
          ),
          String(
            jugador.puntosTotales ?? 0
          ),
          Number(
            jugador.ppg ?? 0
          ).toFixed(1),
          String(
            jugador.rebotesTotales ?? 0
          ),
          Number(
            jugador.rpg ?? 0
          ).toFixed(1),
          String(
            jugador.asistenciasTotales ?? 0
          ),
          Number(
            jugador.apg ?? 0
          ).toFixed(1),
        ]);

      const estiloTabla = (
        inicioY: number,
        lista: any[]
      ) => ({
        startY: inicioY,
        head: encabezados,
        body: crearFilas(lista),
        theme: "grid" as const,
        tableWidth: 273,
        margin: {
          top: inicioY,
          right: 12,
          bottom: 18,
          left: 12,
        },
        styles: {
          fontSize: 7.4,
          cellPadding: {
            top: 1.35,
            right: 1.5,
            bottom: 1.35,
            left: 1.5,
          },
          valign: "middle" as const,
          lineColor: [
            215,
            220,
            228,
          ],
          lineWidth: 0.15,
          textColor: [
            70,
            75,
            85,
          ],
        },
        headStyles: {
          fillColor: [
            20,
            50,
            100,
          ],
          textColor: [
            255,
            255,
            255,
          ],
          fontStyle: "bold" as const,
          halign: "center" as const,
          fontSize: 7.5,
          cellPadding: 1.7,
        },
        alternateRowStyles: {
          fillColor: [
            247,
            249,
            252,
          ],
        },
        columnStyles: {
          0: {
            halign: "center" as const,
            cellWidth: 14,
          },
          1: {
            cellWidth: 68,
          },
          2: {
            cellWidth: 50,
          },
          3: {
            halign: "center" as const,
            cellWidth: 20,
          },
          4: {
            halign: "center" as const,
            cellWidth: 20,
          },
          5: {
            halign: "center" as const,
            cellWidth: 20,
          },
          6: {
            halign: "center" as const,
            cellWidth: 20,
          },
          7: {
            halign: "center" as const,
            cellWidth: 20,
          },
          8: {
            halign: "center" as const,
            cellWidth: 20,
          },
          9: {
            halign: "center" as const,
            cellWidth: 20,
          },
        },
        didParseCell: (
          data: any
        ) => {
          if (
            data.section !== "body"
          ) {
            return;
          }

          const jugador =
            lista[data.row.index];

          if (!jugador) return;

          if (
            data.column.index === 4 &&
            maxPuntos > 0 &&
            Number(
              jugador.puntosTotales ?? 0
            ) === maxPuntos
          ) {
            data.cell.styles.fillColor = [
              255,
              245,
              230,
            ];

            data.cell.styles.textColor = [
              160,
              75,
              25,
            ];

            data.cell.styles.fontStyle =
              "bold";
          }

          if (
            data.column.index === 6 &&
            maxRebotes > 0 &&
            Number(
              jugador.rebotesTotales ?? 0
            ) === maxRebotes
          ) {
            data.cell.styles.fillColor = [
              238,
              243,
              255,
            ];

            data.cell.styles.textColor = [
              55,
              75,
              145,
            ];

            data.cell.styles.fontStyle =
              "bold";
          }

          if (
            data.column.index === 8 &&
            maxAsistencias > 0 &&
            Number(
              jugador.asistenciasTotales ?? 0
            ) === maxAsistencias
          ) {
            data.cell.styles.fillColor = [
              255,
              246,
              228,
            ];

            data.cell.styles.textColor = [
              140,
              90,
              20,
            ];

            data.cell.styles.fontStyle =
              "bold";
          }
        },
      });

      // Dividimos los 44 jugadores en 3 páginas para una lectura
      // más profesional y uniforme. El orden del ranking se conserva.
      const primeraPagina =
        jugadoresExportacion.slice(0, 15);

      const segundaPagina =
        jugadoresExportacion.slice(15, 30);

      const terceraPagina =
        jugadoresExportacion.slice(30);

      // =========================
      // PÁGINA 1
      // =========================
      // Incluye encabezado oficial, logo LIBAVIME, resumen y posiciones 1–15.
      dibujarEncabezado(
        `TORNEO ${temporada} · ${nombreLiga} · RANKING OFICIAL`
      );

      dibujarResumen();

      autoTable(
        doc,
        estiloTabla(
          72,
          primeraPagina
        ) as any
      );

      // =========================
      // PÁGINA 2
      // =========================
      // El mismo encabezado se dibuja de nuevo para que el logo de LIBAVIME
      // aparezca también en esta página, manteniendo el orden 16–30.
      doc.addPage();

      dibujarEncabezado(
        `TORNEO ${temporada} · ${nombreLiga} · CONTINUACIÓN · POSICIONES 16–30`
      );

      autoTable(
        doc,
        estiloTabla(
          45,
          segundaPagina
        ) as any
      );

      // =========================
      // PÁGINA 3
      // =========================
      // Mismo encabezado y logo LIBAVIME. Continúa el ranking 31–44.
      doc.addPage();

      dibujarEncabezado(
        `TORNEO ${temporada} · ${nombreLiga} · CONTINUACIÓN · POSICIONES 31–44`
      );

      autoTable(
        doc,
        estiloTabla(
          45,
          terceraPagina
        ) as any
      );

      // Numeración y pie de página en las tres páginas.
      const totalPaginas =
        doc.getNumberOfPages();

      for (
        let pagina = 1;
        pagina <= totalPaginas;
        pagina++
      ) {
        doc.setPage(pagina);

        dibujarPie(
          pagina,
          totalPaginas
        );
      }

      doc.save(
        `Estadisticas_${prefijoArchivo}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    } catch (error) {
      console.error(
        "Error al generar el PDF:",
        error
      );

      alert(
        "No se pudo generar el PDF. Inténtalo nuevamente."
      );
    }
  }


  async function descargarTarjetaDestacada(
    jugador: any,
    equipo: any,
    indice: number,
    fechaJornada: string,
    formato: "story" | "feed"
  ) {
    const tarjetaId = fechaJornada + "-" + (equipo.slug ?? equipo.nombre) + "-" + jugador.id;
    const tarjeta = tarjetasDestacadosRef.current[tarjetaId];

    if (!tarjeta || !tarjeta.isConnected) {
      alert("No se encontró la tarjeta que deseas descargar. Vuelve a seleccionar la jornada.");
      return;
    }

    const claveExportacion = tarjetaId + ":" + formato;
    setJugadorExportandoId(claveExportacion);
    let urlTemporal: string | null = null;

    try {
      // Safari móvil puede omitir imágenes al convertir HTML mediante SVG foreignObject.
      // Por eso se dibujan logo, fotografía, textos y estadísticas directamente en canvas.
      const cargarImagen = async (fuente: string, descripcion: string): Promise<HTMLImageElement> => {
        if (!fuente) throw new Error("No se encontró " + descripcion + ".");

        const url = new URL(fuente, window.location.origin);
        const ruta = url.origin === window.location.origin
          ? url.pathname + url.search
          : "/api/imagen-exportacion?src=" + encodeURIComponent(url.href);

        const respuesta = await fetch(ruta, { cache: "force-cache" });
        if (!respuesta.ok) {
          let detalle = "";
          try {
            const cuerpo = await respuesta.json();
            detalle = cuerpo && cuerpo.error ? " " + cuerpo.error : "";
          } catch {}
          throw new Error("No se pudo cargar " + descripcion + "." + detalle);
        }

        const blob = await respuesta.blob();
        if (!blob.type.startsWith("image/") || blob.size === 0) {
          throw new Error(descripcion + " no es un archivo de imagen válido.");
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const lector = new FileReader();
          lector.onload = () => {
            if (typeof lector.result === "string") resolve(lector.result);
            else reject(new Error("No se pudo preparar " + descripcion + "."));
          };
          lector.onerror = () => reject(new Error("No se pudo leer " + descripcion + "."));
          lector.readAsDataURL(blob);
        });

        const imagen = new window.Image();
        imagen.src = dataUrl;
        if (typeof imagen.decode === "function") {
          await imagen.decode();
        } else {
          await new Promise<void>((resolve, reject) => {
            imagen.onload = () => resolve();
            imagen.onerror = () => reject(new Error("No se pudo decodificar " + descripcion + "."));
          });
        }

        if (!imagen.naturalWidth || !imagen.naturalHeight) {
          throw new Error(descripcion + " llegó vacía.");
        }
        return imagen;
      };

      const fotoJugador =
        jugador.foto &&
        (jugador.foto.startsWith("http") || jugador.foto.startsWith("/"))
          ? jugador.foto
          : logoDeLiga;

      const [logo, foto] = await Promise.all([
        cargarImagen(equipo.logo, "el escudo de " + equipo.nombre),
        cargarImagen(fotoJugador, "la fotografía de " + (jugador.nombre || "el jugador")),
      ]);

      const esHistoria = formato === "story";
      const anchoFinal = 1080;
      const altoFinal = esHistoria ? 1920 : 1350;
      const canvas = document.createElement("canvas");
      canvas.width = anchoFinal;
      canvas.height = altoFinal;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("El navegador no pudo crear el lienzo de la imagen.");

      const equipoEstilos: Record<string, {
        inicio: string; medio: string; final: string; borde: string; brillo: string; texto: string; textoSuave: string;
      }> = {
        Gladiadores: {
          inicio: "#052e16", medio: "#166534", final: "#16a34a",
          borde: "#4ade80", brillo: "rgba(134,239,172,0.18)",
          texto: "#ffffff", textoSuave: "#dcfce7",
        },
        Vikingos: {
          inicio: "#3b0764", medio: "#6b21a8", final: "#9333ea",
          borde: "#c084fc", brillo: "rgba(216,180,254,0.18)",
          texto: "#ffffff", textoSuave: "#f3e8ff",
        },
        Titanes: {
          inicio: "#450a0a", medio: "#991b1b", final: "#dc2626",
          borde: "#f87171", brillo: "rgba(252,165,165,0.18)",
          texto: "#ffffff", textoSuave: "#fee2e2",
        },
        Espartanos: {
          inicio: "#a16207", medio: "#eab308", final: "#fde047",
          borde: "#fde047", brillo: "rgba(255,255,255,0.23)",
          texto: "#0f172a", textoSuave: "#1e293b",
        },
      };
      const estilo = equipoEstilos[equipo.nombre] ?? {
        inicio: "#0f172a", medio: "#1e293b", final: "#334155",
        borde: "#94a3b8", brillo: "rgba(148,163,184,0.18)",
        texto: "#ffffff", textoSuave: "#e2e8f0",
      };
      const primero = indice === 0;

      const redondear = (
        contexto: CanvasRenderingContext2D,
        x: number, y: number, ancho: number, alto: number, radio: number
      ) => {
        const r = Math.min(radio, ancho / 2, alto / 2);
        contexto.beginPath();
        contexto.moveTo(x + r, y);
        contexto.lineTo(x + ancho - r, y);
        contexto.arcTo(x + ancho, y, x + ancho, y + r, r);
        contexto.lineTo(x + ancho, y + alto - r);
        contexto.arcTo(x + ancho, y + alto, x + ancho - r, y + alto, r);
        contexto.lineTo(x + r, y + alto);
        contexto.arcTo(x, y + alto, x, y + alto - r, r);
        contexto.lineTo(x, y + r);
        contexto.arcTo(x, y, x + r, y, r);
        contexto.closePath();
      };

      const dibujarTextoAjustado = (
        contexto: CanvasRenderingContext2D,
        texto: string,
        x: number,
        y: number,
        anchoMaximo: number,
        tamano: number,
        minimo: number,
        color: string,
        peso = 900
      ) => {
        let tamanoActual = tamano;
        contexto.textAlign = "center";
        contexto.textBaseline = "middle";
        contexto.fillStyle = color;
        contexto.font = peso + " " + tamanoActual + "px Arial, Helvetica, sans-serif";
        while (contexto.measureText(texto).width > anchoMaximo && tamanoActual > minimo) {
          tamanoActual -= 2;
          contexto.font = peso + " " + tamanoActual + "px Arial, Helvetica, sans-serif";
        }
        contexto.fillText(texto, x, y, anchoMaximo);
      };

      const dibujarImagenContain = (
        contexto: CanvasRenderingContext2D,
        imagen: HTMLImageElement,
        x: number,
        y: number,
        ancho: number,
        alto: number
      ) => {
        const escala = Math.min(ancho / imagen.naturalWidth, alto / imagen.naturalHeight);
        const w = imagen.naturalWidth * escala;
        const h = imagen.naturalHeight * escala;
        contexto.drawImage(imagen, x + (ancho - w) / 2, y + (alto - h) / 2, w, h);
      };

      const dibujarImagenCoverCircular = (
        contexto: CanvasRenderingContext2D,
        imagen: HTMLImageElement,
        x: number,
        y: number,
        diametro: number
      ) => {
        const origenW = imagen.naturalWidth;
        const origenH = imagen.naturalHeight;
        let sx = 0, sy = 0, sw = origenW, sh = origenH;

        if (origenW > origenH) {
          sw = origenH;
          sx = (origenW - sw) / 2;
        } else {
          sh = origenW;
          sy = (origenH - sh) * 0.38;
        }

        contexto.save();
        contexto.beginPath();
        contexto.arc(x + diametro / 2, y + diametro / 2, diametro / 2, 0, Math.PI * 2);
        contexto.clip();
        contexto.drawImage(imagen, sx, sy, sw, sh, x, y, diametro, diametro);
        contexto.restore();
      };

      // Fondo vertical final.
      const fondo = ctx.createLinearGradient(0, 0, anchoFinal, altoFinal);
      fondo.addColorStop(0, "#061326");
      fondo.addColorStop(0.52, "#102b4a");
      fondo.addColorStop(1, "#07182d");
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, anchoFinal, altoFinal);

      const brilloAzul = ctx.createRadialGradient(110, 150, 8, 110, 150, 390);
      brilloAzul.addColorStop(0, "rgba(59,130,246,0.32)");
      brilloAzul.addColorStop(1, "rgba(59,130,246,0)");
      ctx.fillStyle = brilloAzul;
      ctx.fillRect(0, 0, anchoFinal, altoFinal);

      const brilloDorado = ctx.createRadialGradient(970, altoFinal - 120, 8, 970, altoFinal - 120, 380);
      brilloDorado.addColorStop(0, "rgba(234,179,8,0.22)");
      brilloDorado.addColorStop(1, "rgba(234,179,8,0)");
      ctx.fillStyle = brilloDorado;
      ctx.fillRect(0, 0, anchoFinal, altoFinal);

      // Ficha con proporciones equivalentes a la tarjeta de la página.
      const tarjetaCanvas = document.createElement("canvas");
      tarjetaCanvas.width = 900;
      tarjetaCanvas.height = 1420;
      const ficha = tarjetaCanvas.getContext("2d");
      if (!ficha) throw new Error("No se pudo preparar el diseño de la ficha.");

      const degradadoFicha = ficha.createLinearGradient(0, 0, 900, 1420);
      degradadoFicha.addColorStop(0, estilo.inicio);
      degradadoFicha.addColorStop(0.52, estilo.medio);
      degradadoFicha.addColorStop(1, estilo.final);
      redondear(ficha, 5, 5, 890, 1410, 42);
      ficha.fillStyle = degradadoFicha;
      ficha.fill();

      ficha.save();
      redondear(ficha, 5, 5, 890, 1410, 42);
      ficha.clip();

      const brilloFicha1 = ficha.createRadialGradient(790, 140, 10, 790, 140, 330);
      brilloFicha1.addColorStop(0, estilo.brillo);
      brilloFicha1.addColorStop(1, "rgba(255,255,255,0)");
      ficha.fillStyle = brilloFicha1;
      ficha.fillRect(0, 0, 900, 1420);

      const brilloFicha2 = ficha.createRadialGradient(100, 1260, 10, 100, 1260, 350);
      brilloFicha2.addColorStop(0, estilo.brillo);
      brilloFicha2.addColorStop(1, "rgba(255,255,255,0)");
      ficha.fillStyle = brilloFicha2;
      ficha.fillRect(0, 0, 900, 1420);
      ficha.restore();

      ficha.strokeStyle = estilo.borde;
      ficha.lineWidth = 8;
      redondear(ficha, 5, 5, 890, 1410, 42);
      ficha.stroke();

      // Escudo y encabezado.
      redondear(ficha, 58, 58, 132, 132, 22);
      ficha.fillStyle = "#ffffff";
      ficha.shadowColor = "rgba(0,0,0,0.22)";
      ficha.shadowBlur = 18;
      ficha.shadowOffsetY = 7;
      ficha.fill();
      ficha.shadowColor = "transparent";
      ficha.shadowBlur = 0;
      ficha.shadowOffsetY = 0;
      ficha.save();
      redondear(ficha, 72, 72, 104, 104, 14);
      ficha.clip();
      dibujarImagenContain(ficha, logo, 74, 74, 100, 100);
      ficha.restore();

      ficha.textAlign = "left";
      ficha.textBaseline = "middle";
      ficha.fillStyle = estilo.textoSuave;
      ficha.font = "900 28px Arial, Helvetica, sans-serif";
      ficha.fillText(`${nombreLiga} ${temporada}`, 220, 91);
      ficha.fillStyle = estilo.texto;
      ficha.font = "900 38px Arial, Helvetica, sans-serif";
      ficha.fillText(String(equipo.nombre || "").toUpperCase(), 220, 145, 390);

      // Etiqueta de posición.
      redondear(ficha, 660, 82, 185, 66, 34);
      ficha.fillStyle = primero ? "#fde047" : "#ffffff";
      ficha.shadowColor = "rgba(0,0,0,0.2)";
      ficha.shadowBlur = 14;
      ficha.shadowOffsetY = 5;
      ficha.fill();
      ficha.shadowColor = "transparent";
      ficha.shadowBlur = 0;
      ficha.shadowOffsetY = 0;
      ficha.fillStyle = primero ? "#713f12" : "#0f172a";
      ficha.font = "900 28px Arial, Helvetica, sans-serif";
      ficha.textAlign = "center";
      ficha.fillText(primero ? "TOP 1" : "TOP 2", 752, 116);

      // Fotografía: recorte circular y encuadre vertical.
      const fotoX = 235, fotoY = 270, fotoD = 430;
      ficha.beginPath();
      ficha.arc(450, fotoY + fotoD / 2, fotoD / 2 + 9, 0, Math.PI * 2);
      ficha.fillStyle = primero ? "#fde047" : "rgba(255,255,255,0.86)";
      ficha.shadowColor = "rgba(0,0,0,0.28)";
      ficha.shadowBlur = 24;
      ficha.shadowOffsetY = 10;
      ficha.fill();
      ficha.shadowColor = "transparent";
      ficha.shadowBlur = 0;
      ficha.shadowOffsetY = 0;
      dibujarImagenCoverCircular(ficha, foto, fotoX, fotoY, fotoD);

      // Nombre del jugador.
      ficha.fillStyle = estilo.textoSuave;
      ficha.font = "900 23px Arial, Helvetica, sans-serif";
      ficha.textAlign = "center";
      ficha.fillText("JUGADOR DESTACADO DE LA JORNADA", 450, 770);
      dibujarTextoAjustado(
        ficha,
        String(jugador.nombre || "JUGADOR").toUpperCase(),
        450, 842, 820, 58, 34, estilo.texto
      );
      ficha.beginPath();
      ficha.moveTo(410, 895);
      ficha.lineTo(490, 895);
      ficha.lineWidth = 8;
      ficha.lineCap = "round";
      ficha.strokeStyle = "#fde047";
      ficha.stroke();

      // Estadísticas del partido.
      const estadisticas = [
        { label: "PUNTOS", value: Number(jugador.puntosPartido || 0), color: "#1d4ed8" },
        { label: "REBOTES", value: Number(jugador.rebotesPartido || 0), color: "#15803d" },
        { label: "ASISTENCIAS", value: Number(jugador.asistenciasPartido || 0), color: "#c2410c" },
      ];
      const statX = [55, 335, 615];
      estadisticas.forEach((stat, i) => {
        redondear(ficha, statX[i], 965, 230, 170, 26);
        ficha.fillStyle = "rgba(255,255,255,0.94)";
        ficha.shadowColor = "rgba(0,0,0,0.16)";
        ficha.shadowBlur = 16;
        ficha.shadowOffsetY = 6;
        ficha.fill();
        ficha.shadowColor = "transparent";
        ficha.shadowBlur = 0;
        ficha.shadowOffsetY = 0;
        ficha.fillStyle = stat.color;
        ficha.font = "900 23px Arial, Helvetica, sans-serif";
        ficha.textAlign = "center";
        ficha.fillText(stat.label, statX[i] + 115, 1015);
        ficha.fillStyle = "#020617";
        ficha.font = "900 70px Arial, Helvetica, sans-serif";
        ficha.fillText(String(stat.value), statX[i] + 115, 1080);
      });

      // Pie y crédito de la ficha.
      ficha.beginPath();
      ficha.moveTo(58, 1190);
      ficha.lineTo(842, 1190);
      ficha.lineWidth = 2;
      ficha.strokeStyle = equipo.nombre === "Espartanos" ? "rgba(15,23,42,0.28)" : "rgba(255,255,255,0.38)";
      ficha.stroke();
      ficha.textAlign = "center";
      ficha.fillStyle = estilo.textoSuave;
      ficha.font = "900 20px Arial, Helvetica, sans-serif";
      ficha.fillText("LIGA DE BALONCESTO DE VISITADORES MÉDICOS", 450, 1245);
      ficha.font = "700 19px Arial, Helvetica, sans-serif";
      ficha.fillText(`TORNEO ${nombreLiga} ${temporada}`, 450, 1290);
      ficha.font = "700 18px Arial, Helvetica, sans-serif";
      ficha.fillText("Diseñado y desarrollado por Emmi de la Cruz", 450, 1345);

      // Ajuste del mismo diseño a Feed o Story.
      const margenHorizontal = 64;
      const margenVertical = esHistoria ? 170 : 120;
      const escala = Math.min(
        (anchoFinal - margenHorizontal * 2) / tarjetaCanvas.width,
        (altoFinal - margenVertical * 2) / tarjetaCanvas.height
      );
      const anchoTarjeta = tarjetaCanvas.width * escala;
      const altoTarjeta = tarjetaCanvas.height * escala;
      const xTarjeta = (anchoFinal - anchoTarjeta) / 2;
      const yTarjeta = (altoFinal - altoTarjeta) / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.42)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      ctx.drawImage(tarjetaCanvas, xTarjeta, yTarjeta, anchoTarjeta, altoTarjeta);
      ctx.restore();

      const archivo = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("El navegador no pudo crear el archivo PNG."));
        }, "image/png");
      });

      if (archivo.size < 10_000) {
        throw new Error("El PNG generado quedó demasiado pequeño.");
      }

      const limpiarNombre = (valor: string) =>
        String(valor ?? "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .replace(/^_|_$/g, "") || "liga";

      const nombreArchivo = prefijoArchivo + "_" + limpiarNombre(equipo.nombre) + "_" +
        limpiarNombre(jugador.nombre) + "_" +
        (esHistoria ? "Historia_1080x1920" : "Feed_1080x1350") + ".png";

      urlTemporal = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = urlTemporal;
      enlace.download = nombreArchivo;
      enlace.style.display = "none";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      const urlLiberar = urlTemporal;
      window.setTimeout(() => URL.revokeObjectURL(urlLiberar), 60_000);
      urlTemporal = null;
    } catch (error) {
      console.error("Error generando tarjeta del jugador:", error);
      const mensaje = error instanceof Error ? error.message : "Error desconocido";
      alert("No se pudo descargar la ficha completa. " + mensaje);
    } finally {
      if (urlTemporal) URL.revokeObjectURL(urlTemporal);
      setJugadorExportandoId(null);
    }
  }

  if (cargando) {
    return (
      <>
        <Navbar />

        <main className="min-h-screen bg-slate-100 pt-24 flex items-center justify-center">
          <h1 className="text-2xl font-bold text-blue-900">
            Cargando estadísticas...
          </h1>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-slate-100 pt-24 p-4 md:p-10">
        <div className="max-w-6xl mx-auto">

          {/* TÍTULO */}

          <h1 className="text-3xl md:text-4xl font-black text-center text-blue-900 mb-4">
            📊 Estadísticas {nombreLiga}
          </h1>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <button type="button" onClick={() => setFaseSeleccionada("serie_regular")} className={`rounded-xl px-6 py-3 font-bold shadow transition ${faseSeleccionada === "serie_regular" ? "bg-blue-900 text-white" : "bg-white text-blue-900 border border-blue-200"}`}>
              Serie Regular
            </button>
            <button type="button" onClick={() => setFaseSeleccionada("finales")} className={`rounded-xl px-6 py-3 font-bold shadow transition ${faseSeleccionada === "finales" ? "bg-blue-900 text-white" : "bg-white text-blue-900 border border-blue-200"}`}>
              Finales
            </button>
          </div>


          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setVistaSeleccionada("estadisticas")}
              className={`rounded-xl px-6 py-3 font-bold shadow transition ${vistaSeleccionada === "estadisticas" ? "bg-blue-900 text-white" : "bg-white text-blue-900 border border-blue-200"}`}
            >
              📊 Estadísticas y lideratos
            </button>
            <button
              type="button"
              onClick={() => setVistaSeleccionada("destacados")}
              className={`rounded-xl px-6 py-3 font-bold shadow transition ${vistaSeleccionada === "destacados" ? "bg-blue-900 text-white" : "bg-white text-blue-900 border border-blue-200"}`}
            >
              ⭐ Jugadores destacados
            </button>
          </div>

          {vistaSeleccionada === "destacados" ? (
            <section className="mt-2 mb-10">
              <div className="max-w-7xl mx-auto px-1 sm:px-2">
                <div className="text-center mb-8 md:mb-10">
                  <div className="inline-flex items-center gap-3">
                    <span className="text-4xl md:text-5xl">🏀</span>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-blue-950">
                      JUGADORES <span className="text-yellow-500">DESTACADOS</span>
                    </h2>
                  </div>
                  <p className="mt-3 text-sm sm:text-base md:text-lg font-bold text-slate-500">
                    {faseSeleccionada === "finales" ? "Finales" : "Serie Regular"} · Los dos mejores anotadores de cada equipo, organizados por jornada
                  </p>
                  <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-yellow-400" />
                <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm">
                  <label className="mb-2 block text-sm font-black uppercase tracking-wide text-blue-950">
                    Seleccionar jornada
                  </label>
                  <select
                    value={jornadaActual?.fecha ?? ""}
                    onChange={(evento) => setJornadaSeleccionada(evento.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-700"
                  >
                    {jornadasDestacados.map((jornada) => (
                      <option key={jornada.fecha} value={jornada.fecha}>
                        Jornada {jornada.numero} · {jornada.fecha.split("-").reverse().join("/")}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {jornadaActual?.cruces?.join(" · ")}
                  </p>
                </div>
                </div>


                {jornadaActual && jornadaActual.equipos.length > 0 ? (
                  <div className="space-y-10">
                    <div className="text-center">
                      <p className="text-xl font-black uppercase tracking-wide text-blue-950">
                        JORNADA {jornadaActual.numero}
                      </p>
                      <p className="text-sm font-semibold text-slate-500">
                        {jornadaActual.fecha.split("-").reverse().join("/")}
                      </p>
                    </div>
                    {jornadaActual.equipos.map((equipo: any) => {
                      const colores: Record<string, { fondo: string; borde: string; brillo: string; texto: string; textoSuave: string }> = {
                        Gladiadores: {
                          fondo: "from-green-950 via-green-800 to-green-600",
                          borde: "border-green-400",
                          brillo: "bg-green-300/25",
                          texto: "text-white",
                          textoSuave: "text-green-100",
                        },
                        Vikingos: {
                          fondo: "from-purple-950 via-purple-800 to-purple-600",
                          borde: "border-purple-400",
                          brillo: "bg-purple-300/25",
                          texto: "text-white",
                          textoSuave: "text-purple-100",
                        },
                        Titanes: {
                          fondo: "from-red-950 via-red-800 to-red-600",
                          borde: "border-red-400",
                          brillo: "bg-red-300/25",
                          texto: "text-white",
                          textoSuave: "text-red-100",
                        },
                        Espartanos: {
                          fondo: "from-yellow-700 via-yellow-500 to-yellow-300",
                          borde: "border-yellow-300",
                          brillo: "bg-white/25",
                          texto: "text-slate-950",
                          textoSuave: "text-slate-800",
                        },
                      };
                      const color = colores[equipo.nombre] ?? {
                        fondo: "from-slate-950 via-slate-800 to-slate-600",
                        borde: "border-slate-400",
                        brillo: "bg-slate-300/25",
                        texto: "text-white",
                        textoSuave: "text-slate-100",
                      };

                      return (
                        <section key={equipo.nombre}>
                          <div className="mb-5 flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-4">
                            <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white p-1 shadow">
                              <Image
                                src={equipo.logo}
                                alt={equipo.nombre}
                                fill
                                sizes="48px"
                                className="object-contain p-1"
                              />
                            </div>
                            <div>
                              <h3 className="text-2xl font-black uppercase tracking-wide text-blue-950">
                                {equipo.nombre}
                              </h3>
                              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                Dos jugadores destacados · Tarjetas individuales
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-2">
                            {equipo.jugadoresDestacados.map((jugador: any, index: number) => {
                              const fotoJugador =
                                jugador.foto &&
                                (jugador.foto.startsWith("http") || jugador.foto.startsWith("/"))
                                  ? jugador.foto
                                  : logoDeLiga;
                              const primero = index === 0;
                              const tarjetaId = `${jornadaActual.fecha}-${equipo.slug ?? equipo.nombre}-${jugador.id}`;

                              return (
                                <div key={tarjetaId} className="mx-auto w-full max-w-[430px]">
                                  {/* DISEÑO INDIVIDUAL: solo aparece un jugador por tarjeta. */}
                                  <div
                                    ref={(nodo) => {
                                      tarjetasDestacadosRef.current[tarjetaId] = nodo;
                                    }}
                                    className={`relative isolate overflow-hidden rounded-[2rem] border-2 ${color.borde} bg-gradient-to-br ${color.fondo} px-6 py-7 shadow-2xl`}
                                  >
                                    <div className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full ${color.brillo} blur-3xl`} />
                                    <div className={`pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full ${color.brillo} blur-3xl`} />

                                    <div className="relative">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-white p-1.5 shadow-lg">
                                            <Image
                                              src={equipo.logo}
                                              alt={equipo.nombre}
                                              fill
                                              sizes="56px"
                                              className="object-contain p-1.5"
                                            />
                                          </div>
                                          <div>
                                            <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${color.textoSuave}`}>
                                              {nombreLiga} {temporada}
                                            </p>
                                            <p className={`mt-1 text-sm font-black uppercase tracking-wider ${color.texto}`}>
                                              {equipo.nombre}
                                            </p>
                                          </div>
                                        </div>

                                        <div className={`rounded-full px-4 py-2 text-xs font-black shadow-lg ${primero ? "bg-yellow-300 text-yellow-950" : "bg-white text-slate-900"}`}>
                                          {primero ? "🥇 TOP 1" : "🥈 TOP 2"}
                                        </div>
                                      </div>

                                      <div className="mt-7 flex justify-center">
                                        <div className={`relative h-52 w-52 overflow-hidden rounded-full border-[6px] ${primero ? "border-yellow-300" : "border-white/80"} bg-white/20 shadow-2xl`}>
                                          <Image
                                            src={fotoJugador}
                                            unoptimized
                                            crossOrigin="anonymous"
                                            alt={jugador.nombre || `Jugador ${nombreLiga}`}
                                            fill
                                            sizes="208px"
                                            className={`object-cover ${primero ? "scale-[1.38] object-[center_38%]" : "scale-[1.32] object-[center_38%]"}`}
                                          />
                                        </div>
                                      </div>

                                      <div className="mt-6 text-center">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${color.textoSuave}`}>
                                          JUGADOR DESTACADO DE LA JORNADA
                                        </p>
                                        <h4 className={`mt-2 text-2xl font-black leading-tight md:text-3xl ${color.texto}`}>
                                          {jugador.nombre}
                                        </h4>
                                        <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-yellow-300" />
                                      </div>

                                      <div className="mt-7 grid grid-cols-3 gap-3">
                                        {[
                                          { label: "PUNTOS", corto: "PTS", valor: Number(jugador.puntosPartido || 0), color: "text-blue-700" },
                                          { label: "REBOTES", corto: "REB", valor: Number(jugador.rebotesPartido || 0), color: "text-green-700" },
                                          { label: "ASISTENCIAS", corto: "AST", valor: Number(jugador.asistenciasPartido || 0), color: "text-orange-700" },
                                        ].map((estadistica) => (
                                          <div key={estadistica.corto} className="flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-white/90 px-2 py-3 text-center shadow-lg">
                                            <p className={`text-[9px] font-black tracking-wide sm:text-[10px] ${estadistica.color}`}>
                                              {estadistica.label}
                                            </p>
                                            <p className={`mt-2 text-3xl font-black leading-none text-slate-950 sm:text-4xl`}>
                                              {estadistica.valor}
                                            </p>
                                          </div>
                                        ))}
                                      </div>

                                      <div className={`mt-7 border-t pt-4 text-center ${equipo.nombre === "Espartanos" ? "border-black/20" : "border-white/30"}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${color.textoSuave}`}>
                                          LIGA DE BALONCESTO DE VISITADORES MÉDICOS
                                        </p>
                                        <p className={`mt-1 text-[9px] font-semibold ${color.textoSuave}`}>
                                          TORNEO {nombreLiga} {temporada}
                                        </p>
                                        <p className={`mt-2 text-[9px] font-bold tracking-wide ${color.textoSuave}`}>
                                          Diseñado y desarrollado por Emmi de la Cruz
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 grid grid-cols-1 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => descargarTarjetaDestacada(jugador, equipo, index, jornadaActual.fecha, "story")}
                                      disabled={jugadorExportandoId !== null}
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
                                    >
                                      {jugadorExportandoId === `${tarjetaId}:story`
                                        ? "GENERANDO HISTORIA..."
                                        : "📲 DESCARGAR HISTORIA (1080 × 1920)"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => descargarTarjetaDestacada(jugador, equipo, index, jornadaActual.fecha, "feed")}
                                      disabled={jugadorExportandoId !== null}
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-950 bg-white px-5 py-3 text-sm font-black text-blue-950 shadow transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
                                    >
                                      {jugadorExportandoId === `${tarjetaId}:feed`
                                        ? "GENERANDO PUBLICACIÓN..."
                                        : "📸 DESCARGAR FEED (1080 × 1350)"}
                                    </button>
                                    {usuarioAutenticado && (
                                      <Link
                                        href={ruta(`/admin/instagram?tipo=destacados&fecha=${encodeURIComponent(jornadaActual.fecha)}&jugador=${encodeURIComponent(String(jugador.id))}&individual=1&formato=post`)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-5 py-3 text-sm font-black text-amber-950 shadow transition hover:bg-amber-100"
                                      >
                                        🎨 EDITAR FOTO Y ENCUADRE
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-10 text-center shadow">
                    <p className="text-lg font-black text-blue-950">Todavía no hay jornadas con jugadores destacados para esta fase.</p>
                    <p className="mt-2 text-sm text-slate-500">Las jornadas aparecerán cuando existan partidos finalizados con estadísticas registradas.</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <>
          {/* MENSAJE DE ERROR */}

          {errorCarga && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center font-medium">
              {errorCarga}
            </div>
          )}

          {/* ESTADÍSTICAS DE LOS JUGADORES */}

          <section className="mb-10">

            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-4xl font-black text-blue-900">
                🏀 Estadísticas de Jugadores — {faseSeleccionada === "finales" ? "Finales" : "Serie Regular"}
              </h2>
              <button
  type="button"
  onClick={exportarPDF}
  disabled={jugadoresOrdenados.length === 0}
  className="
    mt-4
    inline-flex
    items-center
    justify-center
    gap-2
    rounded-xl
    bg-blue-900
    px-6
    py-3
    font-bold
    text-white
    shadow-lg
    transition
    hover:bg-blue-800
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
>
  📄 Exportar estadísticas en PDF
</button>

              <p className="text-slate-600 mt-2">
                Ranking completo de{" "}
                {jugadoresOrdenados.length} jugadores
                {" "}de {nombreLiga}
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Desplázate para ver todos los jugadores
              </p>
            </div>

            {jugadoresOrdenados.length > 0 ? (

              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

                <div
                  className="
                    max-h-[650px]
                    md:max-h-[720px]
                    overflow-auto
                  "
                >

                  <table className="w-full min-w-[900px] text-left">

                    <thead className="sticky top-0 z-20">

                      <tr className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow">

                        <th className="p-4 text-center whitespace-nowrap">
                          Pos
                        </th>

                        <th className="p-4 whitespace-nowrap">
                          Jugador
                        </th>

                        <th className="p-4 whitespace-nowrap">
                          Equipo
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          JJ
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          PTS
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          PPG
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          REB
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          RPG
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          AST
                        </th>

                        <th className="p-4 text-center whitespace-nowrap">
                          APG
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {jugadoresOrdenados.map(
                        (jugador, index) => {
                          const foto =
                            jugador.foto &&
                            (
                              jugador.foto.startsWith("http") ||
                              jugador.foto.startsWith("/")
                            )
                              ? jugador.foto
                              : logoDeLiga;

                          const hrefJugador =
                            jugador.slug
                              ? `/jugadores/${jugador.slug}`
                              : "#";

                          return (
                            <tr
                              key={
                                jugador.id ??
                                `${jugador.nombre}-${index}`
                              }
                              className="
                                border-b
                                last:border-b-0
                                hover:bg-blue-50
                                transition
                              "
                            >

                              {/* POSICIÓN */}

                              <td className="p-4 text-center font-black text-blue-900 text-lg">

                                {index === 0
                                  ? "🥇"
                                  : index === 1
                                  ? "🥈"
                                  : index === 2
                                  ? "🥉"
                                  : index + 1}

                              </td>

                              {/* JUGADOR */}

                              <td className="p-4">

                                {jugador.slug ? (

                                  <Link
                                    href={hrefJugador}
                                    className="
                                      flex
                                      items-center
                                      gap-3
                                      font-bold
                                      text-slate-900
                                      hover:text-blue-700
                                      transition
                                    "
                                  >

                                    {/* FOTO DEL JUGADOR */}
<div
  className="
    relative
    h-20
    w-20
    min-h-20
    min-w-20
    shrink-0
    overflow-hidden
    rounded-full
    border-4
    border-blue-600
    bg-white
    shadow-lg
  "
>
  <Image
    src={foto}
    unoptimized
    alt={
      jugador.nombre ??
      `Jugador ${nombreLiga}`
    }
    fill
    sizes="80px"
    className="object-cover"
    style={{
      transform: "scale(1.45)",
      transformOrigin: "center center",
      objectPosition: "50% 20%",
    }}
  />
</div>

                                    <span className="whitespace-nowrap">
                                      {jugador.nombre}
                                    </span>

                                  </Link>

                                ) : (

                                  <div
                                    className="
                                      flex
                                      items-center
                                      gap-3
                                      font-bold
                                      text-slate-900
                                    "
                                  >

  {/* FOTO DEL JUGADOR */}
<div
  className="
    relative
    h-20
    w-20
    min-h-20
    min-w-20
    shrink-0
    overflow-hidden
    rounded-full
    border-4
    border-blue-600
    bg-white
    shadow-lg
  "
>
  <Image
    src={foto}
    unoptimized
    alt={
      jugador.nombre ??
      `Jugador ${nombreLiga}`
    }
    fill
    sizes="80px"
    className="object-cover"
    style={{
      transform: "scale(2.2)",
      transformOrigin: "center center",
      objectPosition: "50% 32%",
    }}
  />
</div>
                                    <span className="whitespace-nowrap">
                                      {jugador.nombre}
                                    </span>

                                  </div>

                                )}

                              </td>

                              {/* EQUIPO */}

                              <td className="p-4 text-slate-600 font-medium whitespace-nowrap">

                                {jugador.equipo || "—"}

                              </td>

                              {/* JJ */}

                              <td className="p-4 text-center font-bold">

                                {jugador.partidosJugados}

                              </td>

                              {/* PUNTOS TOTALES */}

                              <td className="p-4 text-center font-bold">

                                {jugador.puntosTotales}

                              </td>

                              {/* PPG */}

                              <td className="p-4 text-center font-black text-blue-900">

                                {Number(
                                  jugador.ppg ?? 0
                                ).toFixed(1)}

                              </td>

                              {/* REBOTES */}

                              <td className="p-4 text-center font-bold">

                                {jugador.rebotesTotales}

                              </td>

                              {/* RPG */}

                              <td className="p-4 text-center font-black text-green-700">

                                {Number(
                                  jugador.rpg ?? 0
                                ).toFixed(1)}

                              </td>

                              {/* ASISTENCIAS */}

                              <td className="p-4 text-center font-bold">

                                {jugador.asistenciasTotales}

                              </td>

                              {/* APG */}

                              <td className="p-4 text-center font-black text-red-700">

                                {Number(
                                  jugador.apg ?? 0
                                ).toFixed(1)}

                              </td>

                            </tr>
                          );
                        }
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            ) : (

              <div className="bg-white rounded-2xl shadow p-8 text-center">

                <p className="text-xl font-bold text-gray-600">
                  No hay jugadores registrados todavía.
                </p>

              </div>

            )}

            {/* LEYENDA */}

            <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm font-medium text-slate-600">

              <span>
                📅 JJ: Partidos jugados
              </span>

              <span>•</span>

              <span>
                🏀 PTS: Puntos totales
              </span>

              <span>•</span>

              <span>
                💪 REB: Rebotes totales
              </span>

              <span>•</span>

              <span>
                🎯 AST: Asistencias totales
              </span>

              <span>•</span>

              <span>
                📊 PPG / RPG / APG:
                {" "}Promedios por partido
              </span>

            </div>

          </section>

          {/* ==========================================
              LIDERATOS COMPLETOS DE LA LIGA
          ========================================== */}

          <section className="mb-10">

            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-4xl font-black text-blue-900">
                🏆 Lideratos de la Liga
              </h2>

              <p className="text-slate-600 mt-2">
                Los 44 jugadores ordenados del 1 al 44 en cada categoría
              </p>

              <button
                type="button"
                onClick={exportarLideratosPDF}
                disabled={jugadores.length === 0}
                className="
                  mt-4
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-emerald-700
                  px-6
                  py-3
                  font-bold
                  text-white
                  shadow-lg
                  transition
                  hover:bg-emerald-600
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                📄 Exportar lideratos en PDF
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* PUNTOS */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-700 to-red-500 p-5 text-white text-center">
                  <h3 className="text-xl md:text-2xl font-black">
                    🏀 LÍDERES EN PUNTOS
                  </h3>
                  <p className="text-red-100 text-sm mt-1">
                    Ranking 1–44 · PUNTOS TOTALES
                  </p>
                </div>

                <div className="max-h-[720px] overflow-y-auto">
                  {rankingPuntos.map((jugador, index) => {
                    const foto =
                      jugador.foto &&
                      (jugador.foto.startsWith("http") ||
                        jugador.foto.startsWith("/"))
                        ? jugador.foto
                        : logoDeLiga;

                    const contenido = (
                      <>
                        <div className="w-8 text-center font-black text-red-700">
                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : index + 1}
                        </div>

                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-red-500 bg-white shadow">
                          <Image
                            src={foto}
                            unoptimized
                            alt={jugador.nombre ?? `Jugador ${nombreLiga}`}
                            fill
                            sizes="48px"
                            className="object-cover"
                            style={{
                              transform: "scale(1.45)",
                              transformOrigin: "center center",
                              objectPosition: "50% 46%",
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">
                            {jugador.nombre}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {jugador.equipo ?? "Sin equipo"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black text-red-700">
                            {Number(jugador.puntosTotales ?? 0)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            PTS
                          </p>
                        </div>
                      </>
                    );

                    return jugador.slug ? (
                      <Link
                        key={jugador.id ?? index}
                        href={ruta(`/jugadores/${jugador.slug}`)}
                        className="flex items-center gap-3 px-4 py-3 border-b hover:bg-red-50 transition"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div
                        key={jugador.id ?? index}
                        className="flex items-center gap-3 px-4 py-3 border-b"
                      >
                        {contenido}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* REBOTES */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-800 to-purple-500 p-5 text-white text-center">
                  <h3 className="text-xl md:text-2xl font-black">
                    💪 LÍDERES EN REBOTES
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">
                    Ranking 1–44 · REBOTES TOTALES
                  </p>
                </div>

                <div className="max-h-[720px] overflow-y-auto">
                  {rankingRebotes.map((jugador, index) => {
                    const foto =
                      jugador.foto &&
                      (jugador.foto.startsWith("http") ||
                        jugador.foto.startsWith("/"))
                        ? jugador.foto
                        : logoDeLiga;

                    const contenido = (
                      <>
                        <div className="w-8 text-center font-black text-purple-700">
                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : index + 1}
                        </div>

                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-purple-500 bg-white shadow">
                          <Image
                            src={foto}
                            unoptimized
                            alt={jugador.nombre ?? `Jugador ${nombreLiga}`}
                            fill
                            sizes="48px"
                            className="object-cover"
                            style={{
                              transform: "scale(1.45)",
                              transformOrigin: "center center",
                              objectPosition: "50% 46%",
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">
                            {jugador.nombre}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {jugador.equipo ?? "Sin equipo"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black text-purple-700">
                            {Number(jugador.rebotesTotales ?? 0)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            REB
                          </p>
                        </div>
                      </>
                    );

                    return jugador.slug ? (
                      <Link
                        key={jugador.id ?? index}
                        href={ruta(`/jugadores/${jugador.slug}`)}
                        className="flex items-center gap-3 px-4 py-3 border-b hover:bg-purple-50 transition"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div
                        key={jugador.id ?? index}
                        className="flex items-center gap-3 px-4 py-3 border-b"
                      >
                        {contenido}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ASISTENCIAS */}
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 p-5 text-white text-center">
                  <h3 className="text-xl md:text-2xl font-black">
                    🎯 LÍDERES EN ASISTENCIAS
                  </h3>
                  <p className="text-yellow-100 text-sm mt-1">
                    Ranking 1–44 · ASISTENCIAS TOTALES
                  </p>
                </div>

                <div className="max-h-[720px] overflow-y-auto">
                  {rankingAsistencias.map((jugador, index) => {
                    const foto =
                      jugador.foto &&
                      (jugador.foto.startsWith("http") ||
                        jugador.foto.startsWith("/"))
                        ? jugador.foto
                        : logoDeLiga;

                    const contenido = (
                      <>
                        <div className="w-8 text-center font-black text-yellow-700">
                          {index === 0
                            ? "🥇"
                            : index === 1
                            ? "🥈"
                            : index === 2
                            ? "🥉"
                            : index + 1}
                        </div>

                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-yellow-500 bg-white shadow">
                          <Image
                            src={foto}
                            unoptimized
                            alt={jugador.nombre ?? `Jugador ${nombreLiga}`}
                            fill
                            sizes="48px"
                            className="object-cover"
                            style={{
                              transform: "scale(1.45)",
                              transformOrigin: "center center",
                              objectPosition: "50% 46%",
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">
                            {jugador.nombre}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {jugador.equipo ?? "Sin equipo"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-black text-yellow-700">
                            {Number(jugador.asistenciasTotales ?? 0)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            AST
                          </p>
                        </div>
                      </>
                    );

                    return jugador.slug ? (
                      <Link
                        key={jugador.id ?? index}
                        href={ruta(`/jugadores/${jugador.slug}`)}
                        className="flex items-center gap-3 px-4 py-3 border-b hover:bg-yellow-50 transition"
                      >
                        {contenido}
                      </Link>
                    ) : (
                      <div
                        key={jugador.id ?? index}
                        className="flex items-center gap-3 px-4 py-3 border-b"
                      >
                        {contenido}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>



            </>
          )}

        </div>
      </main>
    </>
  );
}
