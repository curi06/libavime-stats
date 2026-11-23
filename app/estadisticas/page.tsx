"use client";

import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { equipos } from "../../data/equipos";

export default function Estadisticas() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [faseSeleccionada, setFaseSeleccionada] = useState<"serie_regular" | "finales">("finales");
  const [vistaSeleccionada, setVistaSeleccionada] = useState<"estadisticas" | "destacados">("estadisticas");
  const [jugadoresDestacadosPorEquipo, setJugadoresDestacadosPorEquipo] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    cargarDatos();
  }, [faseSeleccionada]);

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
  `),

      supabase
        .from("partidos")
        .select("*")
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
    // JUGADORES DESTACADOS POR EQUIPO
    // Se utiliza el partido más reciente de cada equipo dentro de
    // la fase seleccionada y se muestran sus dos mejores anotadores.
    // ============================================================
    const normalizarEquipo = (valor: unknown) =>
      String(valor ?? "")
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .trim()
        .toLowerCase();

    const fechaHora = (partido: any) => {
      const fecha = String(partido.fecha ?? "").trim();
      const hora = String(partido.hora ?? "00:00:00").trim();
      const tiempo = new Date(`${fecha}T${hora}`).getTime();
      return Number.isFinite(tiempo) ? tiempo : 0;
    };

    const jugadoresPorId = new Map(
      (jugadoresData ?? []).map((jugador: any) => [String(jugador.id), jugador])
    );

    const resumenesParaDestacados = [...(partidosData ?? [])]
      .sort((a: any, b: any) => fechaHora(b) - fechaHora(a))
      .map((partido: any) => {
        const porJugador = new Map<string, any>();

        (estadisticasData ?? [])
          .filter((registro: any) =>
            String(registro.partido_id) === String(partido.id) &&
            registro.estado !== "no_jugo" &&
            registro.estado !== "lesionado"
          )
          .forEach((registro: any) => {
            const jugador = jugadoresPorId.get(String(registro.jugador_id));
            if (!jugador) return;

            const jugadorId = String(jugador.id);
            if (!porJugador.has(jugadorId)) {
              porJugador.set(jugadorId, {
                ...jugador,
                puntosPartido: 0,
                rebotesPartido: 0,
                asistenciasPartido: 0,
              });
            }

            const acumulado = porJugador.get(jugadorId);
            acumulado.puntosPartido += Number(registro.puntos) || 0;
            acumulado.rebotesPartido += Number(registro.rebotes) || 0;
            acumulado.asistenciasPartido += Number(registro.asistencias) || 0;
          });

        return {
          partido,
          jugadoresPartido: Array.from(porJugador.values()),
        };
      });

    const destacadosCalculados = equipos
      .map((equipo) => {
        const equipoNormalizado = normalizarEquipo(equipo.nombre);
        const resumenDelEquipo = resumenesParaDestacados.find((resumen) =>
          resumen.jugadoresPartido.some(
            (jugador: any) =>
              normalizarEquipo(jugador.equipo) === equipoNormalizado &&
              (Number(jugador.puntosPartido) > 0 ||
                Number(jugador.rebotesPartido) > 0 ||
                Number(jugador.asistenciasPartido) > 0)
          )
        );

        const jugadoresDelEquipo = [...(resumenDelEquipo?.jugadoresPartido ?? [])]
          .filter(
            (jugador: any) =>
              normalizarEquipo(jugador.equipo) === equipoNormalizado &&
              Number(jugador.puntosPartido) > 0
          )
          .sort(
            (a: any, b: any) =>
              Number(b.puntosPartido) - Number(a.puntosPartido) ||
              Number(b.rebotesPartido) - Number(a.rebotesPartido) ||
              Number(b.asistenciasPartido) - Number(a.asistenciasPartido)
          )
          .slice(0, 2);

        return {
          ...equipo,
          jugadoresDestacados: jugadoresDelEquipo,
          fechaPartido: resumenDelEquipo?.partido?.fecha ?? null,
        };
      })
      .filter((equipo) => equipo.jugadoresDestacados.length > 0);

    setJugadoresDestacadosPorEquipo(destacadosCalculados);

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
        const respuesta = await fetch("/logos/LIBAVIME.png");

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
        console.error("No se pudo cargar el logo de LIBAVIME:", error);
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
              "No se pudo insertar el logo de LIBAVIME en el PDF:",
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
          "LIBAVIME · TORNEO 2026 · RANKING OFICIAL",
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
        `Lideratos_LIBAVIME_2026_${new Date()
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
          "/logos/LIBAVIME.png"
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
          "No se pudo cargar el logo de LIBAVIME:",
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
              "No se pudo insertar el logo de LIBAVIME en el PDF:",
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
            "TORNEO 2026 · LIBAVIME",
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
        "TORNEO 2026 · LIBAVIME · RANKING OFICIAL"
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
        "TORNEO 2026 · LIBAVIME · CONTINUACIÓN · POSICIONES 16–30"
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
        "TORNEO 2026 · LIBAVIME · CONTINUACIÓN · POSICIONES 31–44"
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
        `Estadisticas_LIBAVIME_2026_${new Date()
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
            📊 Estadísticas LIBAVIME
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
                    {faseSeleccionada === "finales" ? "Finales" : "Serie Regular"} · Los dos mejores anotadores del partido más reciente de cada equipo
                  </p>
                  <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-yellow-400" />
                </div>

                {jugadoresDestacadosPorEquipo.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    {jugadoresDestacadosPorEquipo.map((equipo) => {
                      const colores: Record<string, { fondo: string; borde: string; brillo: string; texto: string; textoSuave: string }> = {
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
                      const color = colores[equipo.nombre] ?? colores.Gladiadores;

                      return (
                        <div
                          key={equipo.nombre}
                          className={`group relative overflow-hidden rounded-[2rem] border-2 ${color.borde} bg-gradient-to-br ${color.fondo} shadow-2xl transition-all duration-500 hover:-translate-y-2`}
                        >
                          <div className={`absolute -right-16 -top-16 h-48 w-48 rounded-full ${color.brillo} blur-2xl`} />
                          <div className={`absolute -left-20 -bottom-20 h-56 w-56 rounded-full ${color.brillo} blur-3xl`} />

                          <div className="relative px-5 pt-6 md:px-7 md:pt-7">
                            <div className="flex flex-col items-center text-center">
                              <div className={`relative h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-3xl bg-white p-2 shadow-2xl ring-4 ${equipo.nombre === "Gladiadores" ? "ring-green-300" : equipo.nombre === "Vikingos" ? "ring-purple-300" : equipo.nombre === "Titanes" ? "ring-red-300" : "ring-yellow-200"}`}>
                                <Image src={equipo.logo} alt={equipo.nombre} fill sizes="112px" className="object-contain p-2" />
                              </div>
                              <p className={`mt-4 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] ${color.textoSuave}`}>EQUIPO</p>
                              <h3 className={`mt-1 text-3xl md:text-4xl font-black uppercase tracking-tight ${color.texto}`}>{equipo.nombre}</h3>
                              <div className={`mt-3 h-1 w-20 rounded-full ${equipo.nombre === "Gladiadores" ? "bg-green-300" : equipo.nombre === "Vikingos" ? "bg-purple-300" : equipo.nombre === "Titanes" ? "bg-red-300" : "bg-yellow-200"}`} />
                              <p className={`mt-3 text-[10px] md:text-xs font-black uppercase tracking-[0.18em] ${color.textoSuave}`}>⭐ LOS PROTAGONISTAS DE LA JORNADA</p>
                            </div>
                            <div className={`mt-5 border-t ${equipo.nombre === "Espartanos" ? "border-black/10" : "border-white/20"}`} />
                          </div>

                          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 md:p-7">
                            {equipo.jugadoresDestacados.map((jugador: any, index: number) => {
                              const fotoJugador =
                                jugador.foto && (jugador.foto.startsWith("http") || jugador.foto.startsWith("/"))
                                  ? jugador.foto
                                  : "/logos/LIBAVIME.png";
                              const primero = index === 0;

                              return (
                                <Link
                                  key={jugador.id}
                                  href={jugador.slug ? `/jugadores/${jugador.slug}` : "#"}
                                  className="block"
                                >
                                  <div className={`relative h-full overflow-hidden rounded-2xl border backdrop-blur-sm p-4 transition-all duration-300 hover:scale-[1.03] hover:bg-black/30 ${equipo.nombre === "Espartanos" ? "border-black/10 bg-black/10" : "border-white/20 bg-black/20"}`}>
                                    <div className="absolute left-3 top-3 z-20">
                                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-lg shadow-xl ${primero ? "bg-yellow-400" : "bg-slate-200"}`}>
                                        {primero ? "🥇" : "🥈"}
                                      </div>
                                    </div>

                                    <div className="flex justify-center pt-2">
                                      <div className={`relative h-36 w-36 md:h-44 md:w-44 overflow-hidden rounded-full border-4 ${primero ? "border-yellow-300" : "border-white/70"} bg-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-105`}>
                                        <Image
                                          src={fotoJugador}
                                          unoptimized
                                          alt={jugador.nombre || "Jugador LIBAVIME"}
                                          fill
                                          sizes="192px"
                                          className={`object-cover transition-transform duration-500 ${primero ? "scale-[1.38] object-[center_38%]" : "scale-[1.32] object-[center_38%]"}`}
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-5 text-center">
                                      <h4 className={`text-lg md:text-xl font-black leading-tight ${color.texto}`}>{jugador.nombre}</h4>
                                      <p className={`mt-2 inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider shadow-md ${equipo.nombre === "Espartanos" ? "bg-yellow-300 text-yellow-950" : "bg-yellow-400 text-slate-950"}`}>
                                        ⭐ JUGADOR DESTACADO
                                      </p>

                                      <div className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
                                        {[
                                          { label: "PTS", value: Number(jugador.puntosPartido || 0), bg: equipo.nombre === "Espartanos" ? "bg-white/70" : "bg-white/15", labelColor: equipo.nombre === "Espartanos" ? "text-blue-700" : "text-blue-200", valueColor: equipo.nombre === "Espartanos" ? "text-blue-950" : "text-white" },
                                          { label: "REB", value: Number(jugador.rebotesPartido || 0), bg: equipo.nombre === "Espartanos" ? "bg-white/70" : "bg-white/15", labelColor: equipo.nombre === "Espartanos" ? "text-green-700" : "text-green-200", valueColor: equipo.nombre === "Espartanos" ? "text-green-950" : "text-white" },
                                          { label: "AST", value: Number(jugador.asistenciasPartido || 0), bg: equipo.nombre === "Espartanos" ? "bg-white/70" : "bg-white/15", labelColor: equipo.nombre === "Espartanos" ? "text-orange-700" : "text-orange-200", valueColor: equipo.nombre === "Espartanos" ? "text-orange-950" : "text-white" },
                                        ].map((stat) => (
                                          <div key={stat.label} className={`min-w-0 min-h-[78px] rounded-xl px-2 py-3 md:px-3 flex flex-col items-center justify-center ${stat.bg}`}>
                                            <p className={`text-[9px] md:text-[10px] font-black tracking-wide ${stat.labelColor}`}>{stat.label}</p>
                                            <p className={`mt-1 text-xl md:text-2xl font-black leading-none whitespace-nowrap ${stat.valueColor}`}>{stat.value}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>

                          <div className="relative px-5 pb-5 md:px-7 md:pb-7 text-center">
                            <p className={`text-[10px] md:text-xs font-black uppercase tracking-[0.18em] ${color.textoSuave}`}>
                              🏀 LOS PROTAGONISTAS DE LA JORNADA
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-10 text-center shadow">
                    <p className="text-lg font-black text-blue-950">Todavía no hay jugadores destacados para esta fase.</p>
                    <p className="mt-2 text-sm text-slate-500">Se mostrarán cuando los equipos tengan partidos finalizados con estadísticas registradas.</p>
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
                {" "}de LIBAVIME
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
                              : "/logos/LIBAVIME.png";

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
      "Jugador LIBAVIME"
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
      "Jugador LIBAVIME"
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
                        : "/logos/LIBAVIME.png";

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
                            alt={jugador.nombre ?? "Jugador LIBAVIME"}
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
                        href={`/jugadores/${jugador.slug}`}
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
                        : "/logos/LIBAVIME.png";

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
                            alt={jugador.nombre ?? "Jugador LIBAVIME"}
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
                        href={`/jugadores/${jugador.slug}`}
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
                        : "/logos/LIBAVIME.png";

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
                            alt={jugador.nombre ?? "Jugador LIBAVIME"}
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
                        href={`/jugadores/${jugador.slug}`}
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
