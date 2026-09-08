"use client";

import Navbar from "../components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Estadisticas() {
  const [tabla, setTabla] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    setErrorCarga("");

    try {
      await Promise.all([
        cargarTabla(),
        cargarJugadores(),
      ]);
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
  ] = await Promise.all([
    supabase
      .from("jugadores")
      .select("*")
      .order("nombre"),

    supabase
      .from("estadisticas_jugadores")
      .select(`
        jugador_id,
        ppg,
        rpg,
        apg,
        partidos_jugados
      `),
  ]);

  if (jugadoresError) {
    console.error(
      "Error cargando jugadores:",
      jugadoresError
    );
    return;
  }

  if (estadisticasError) {
    console.error(
      "Error cargando estadísticas:",
      estadisticasError
    );
    return;
  }

  const estadisticasPorJugador = new Map(
    (estadisticasData ?? []).map(
      (estadistica: any) => [
        Number(estadistica.jugador_id),
        estadistica,
      ]
    )
  );

  const jugadoresConEstadisticas =
    (jugadoresData ?? []).map(
      (jugador: any) => {
        const estadisticas =
          estadisticasPorJugador.get(
            Number(jugador.id)
          );

        const partidosJugados =
          Number(
            estadisticas?.partidos_jugados
          ) || 0;

        const ppg =
          Number(estadisticas?.ppg) || 0;

        const rpg =
          Number(estadisticas?.rpg) || 0;

        const apg =
          Number(estadisticas?.apg) || 0;

        return {
          ...jugador,

          puntosTotales:
            Number(
              (ppg * partidosJugados).toFixed(1)
            ),

          rebotesTotales:
            Number(
              (rpg * partidosJugados).toFixed(1)
            ),

          asistenciasTotales:
            Number(
              (apg * partidosJugados).toFixed(1)
            ),

          partidosJugados,

          ppg,

          rpg,

          apg,
        };
      }
    );

  setJugadores(jugadoresConEstadisticas);
}
  async function cargarTabla() {
    const { data, error } = await supabase
      .from("partidos")
      .select("*")
      .eq("estado", "Finalizado");

    if (error) {
      console.error(
        "Error cargando tabla:",
        error
      );

      throw error;
    }

    if (!data) {
      setTabla([]);
      return;
    }

    const posiciones: any = {};

    data.forEach((partido: any) => {
      const local =
        partido.equipo_local ??
        partido.local ??
        "";

      const visitante =
        partido.equipo_visitante ??
        partido.visitante ??
        "";

      const puntosLocal =
        partido.puntos_local ??
        partido.puntosLocal;

      const puntosVisitante =
        partido.puntos_visitante ??
        partido.puntosVisitante;

      if (
        !local ||
        !visitante ||
        puntosLocal === null ||
        puntosLocal === undefined ||
        puntosVisitante === null ||
        puntosVisitante === undefined
      ) {
        return;
      }

      if (!posiciones[local]) {
        posiciones[local] = {
          equipo: local,
          pj: 0,
          pg: 0,
          pp: 0,
          pts: 0,
        };
      }

      if (!posiciones[visitante]) {
        posiciones[visitante] = {
          equipo: visitante,
          pj: 0,
          pg: 0,
          pp: 0,
          pts: 0,
        };
      }

      posiciones[local].pj++;
      posiciones[visitante].pj++;

      if (
        Number(puntosLocal) >
        Number(puntosVisitante)
      ) {
        posiciones[local].pg++;
        posiciones[local].pts += 2;

        posiciones[visitante].pp++;
        posiciones[visitante].pts += 1;
      } else if (
        Number(puntosVisitante) >
        Number(puntosLocal)
      ) {
        posiciones[visitante].pg++;
        posiciones[visitante].pts += 2;

        posiciones[local].pp++;
        posiciones[local].pts += 1;
      } else {
        posiciones[local].pts += 1;
        posiciones[visitante].pts += 1;
      }
    });

    const tablaFinal = Object.values(
      posiciones
    ).sort(
      (a: any, b: any) => {
        if (b.pts !== a.pts) {
          return b.pts - a.pts;
        }

        if (b.pg !== a.pg) {
          return b.pg - a.pg;
        }

        return a.equipo.localeCompare(
          b.equipo
        );
      }
    );

    setTabla(tablaFinal);
  }

  const jugadoresOrdenados = [...jugadores].sort(
    (a, b) => {
      const puntos =
        Number(b.ppg) - Number(a.ppg);

      if (puntos !== 0) {
        return puntos;
      }

      const rebotes =
        Number(b.rpg) - Number(a.rpg);

      if (rebotes !== 0) {
        return rebotes;
      }

      const asistencias =
        Number(b.apg) - Number(a.apg);

      if (asistencias !== 0) {
        return asistencias;
      }

      return String(
        a.nombre ?? ""
      ).localeCompare(
        String(b.nombre ?? "")
      );
    }
  );

  // ==========================================
  // LIDERATOS COMPLETOS DE LA LIGA
  // Se incluyen todos los jugadores registrados.
  // ==========================================

  const rankingPuntos = [...jugadores].sort((a, b) => {
    const diferencia = Number(b.ppg ?? 0) - Number(a.ppg ?? 0);
    if (diferencia !== 0) return diferencia;

    const diferenciaTotal =
      Number(b.puntosTotales ?? 0) - Number(a.puntosTotales ?? 0);
    if (diferenciaTotal !== 0) return diferenciaTotal;

    return String(a.nombre ?? "").localeCompare(
      String(b.nombre ?? "")
    );
  });

  const rankingRebotes = [...jugadores].sort((a, b) => {
    const diferencia = Number(b.rpg ?? 0) - Number(a.rpg ?? 0);
    if (diferencia !== 0) return diferencia;

    const diferenciaTotal =
      Number(b.rebotesTotales ?? 0) - Number(a.rebotesTotales ?? 0);
    if (diferenciaTotal !== 0) return diferenciaTotal;

    return String(a.nombre ?? "").localeCompare(
      String(b.nombre ?? "")
    );
  });

  const rankingAsistencias = [...jugadores].sort((a, b) => {
    const diferencia = Number(b.apg ?? 0) - Number(a.apg ?? 0);
    if (diferencia !== 0) return diferencia;

    const diferenciaTotal =
      Number(b.asistenciasTotales ?? 0) - Number(a.asistenciasTotales ?? 0);
    if (diferenciaTotal !== 0) return diferenciaTotal;

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
        campo: "ppg" | "rpg" | "apg",
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
          Number(jugador[campo] ?? 0).toFixed(1),
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
              campo === "ppg"
                ? "PUNTOS POR PARTIDO"
                : campo === "rpg"
                ? "REBOTES POR PARTIDO"
                : "ASISTENCIAS POR PARTIDO",
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
          campo: "ppg" as const,
          titulo: "LÍDERES EN PUNTOS",
          subtitulo: "Promedio de puntos por partido · Mayor a menor",
        },
        {
          lista: rankingRebotes,
          campo: "rpg" as const,
          titulo: "LÍDERES EN REBOTES",
          subtitulo: "Promedio de rebotes por partido · Mayor a menor",
        },
        {
          lista: rankingAsistencias,
          campo: "apg" as const,
          titulo: "LÍDERES EN ASISTENCIAS",
          subtitulo: "Promedio de asistencias por partido · Mayor a menor",
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

          <h1 className="text-3xl md:text-4xl font-black text-center text-blue-900 mb-8">
            📊 Estadísticas LIBAVIME
          </h1>

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
                🏀 Estadísticas de Jugadores
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
                    Ranking 1–44 · PPG
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
                            {Number(jugador.ppg ?? 0).toFixed(1)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            PPG
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
                    Ranking 1–44 · RPG
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
                            {Number(jugador.rpg ?? 0).toFixed(1)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            RPG
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
                    Ranking 1–44 · APG
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
                            {Number(jugador.apg ?? 0).toFixed(1)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500">
                            APG
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

          {/* TABLA DE POSICIONES */}

          <div className="bg-white p-6 rounded-2xl shadow-xl mt-8">

            <h2 className="text-2xl md:text-3xl font-black text-blue-900 mb-5">
              🏆 Tabla de Posiciones
            </h2>

            {tabla.length > 0 ? (

              <div className="overflow-x-auto">

                <table className="w-full text-left min-w-[600px]">

                  <thead>

                    <tr className="border-b bg-blue-900 text-white">

                      <th className="p-4 text-center">
                        Pos
                      </th>

                      <th className="p-4">
                        Equipo
                      </th>

                      <th className="p-4 text-center">
                        PJ
                      </th>

                      <th className="p-4 text-center">
                        PG
                      </th>

                      <th className="p-4 text-center">
                        PP
                      </th>

                      <th className="p-4 text-center">
                        PTS
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {tabla.map(
                      (equipo, index) => (

                        <tr
                          key={equipo.equipo}
                          className="
                            border-b
                            hover:bg-slate-50
                            transition
                          "
                        >

                          <td className="p-4 text-center font-bold">
                            {index + 1}
                          </td>

                          <td className="p-4 font-bold">
                            {equipo.equipo}
                          </td>

                          <td className="p-4 text-center">
                            {equipo.pj}
                          </td>

                          <td className="p-4 text-center">
                            {equipo.pg}
                          </td>

                          <td className="p-4 text-center">
                            {equipo.pp}
                          </td>

                          <td className="p-4 text-center font-black text-blue-900">
                            {equipo.pts}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <p className="text-gray-500">
                Todavía no hay partidos finalizados.
              </p>

            )}

          </div>

        </div>
      </main>
    </>
  );
}