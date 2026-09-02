"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DashboardStats from "@/app/components/admin/DashboardStats";
import NextGameCard from "@/app/components/admin/NextGameCard";
import QuickActions from "@/app/components/admin/QuickActions";
import LatestResults from "@/app/components/admin/LatestResults";
export default function AdminPage() {
const router = useRouter();
const [totalJugadores, setTotalJugadores] = useState(0);
const [totalEquipos, setTotalEquipos] = useState(0);
const [totalPartidos, setTotalPartidos] = useState(0);
const [proximoPartido, setProximoPartido] = useState<any>(null);
const [ultimosResultados, setUltimosResultados] = useState<any[]>([]);

  useEffect(() => {
  verificarSesion();
  cargarDashboard();
}, []);

async function verificarSesion() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    router.push("/login");
  }
}

async function cargarDashboard() {
  const { count: jugadores } = await supabase
    .from("jugadores")
    .select("*", { count: "exact", head: true });

  const { count: equipos } = await supabase
    .from("equipos")
    .select("*", { count: "exact", head: true });

  const { count: partidos } = await supabase
    .from("partidos")
    .select("*", { count: "exact", head: true });

  setTotalJugadores(jugadores || 0);
  setTotalEquipos(equipos || 0);
  setTotalPartidos(partidos || 0);

  const { data: proximo } = await supabase
  .from("partidos")
  .select("*")
  .eq("estado", "Programado")
  .order("fecha", { ascending: true })
  .limit(1)
  .single();

  setProximoPartido(proximo);

  // 👇 Agrega este bloque aquí
  const { data: resultados } = await supabase
    .from("partidos")
    .select("*")
    .eq("estado", "Finalizado")
    .order("fecha", { ascending: false })
    .limit(5);

  setUltimosResultados(resultados ?? []);
}

 return (
  <>
    <div className="max-w-6xl mx-auto">

      <div className="flex justify-end mb-4">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700"
        >
          🚪 Cerrar sesión
        </button>
      </div>

      <h1 className="text-4xl md:text-5xl font-black text-center text-blue-900 mb-10">
        ⚙️ Panel de Administración LIBAVIME
      </h1>

      {/* Tarjetas de estadísticas */}
    <DashboardStats
  totalJugadores={totalJugadores}
  totalEquipos={totalEquipos}
  totalPartidos={totalPartidos}
/>

<NextGameCard proximoPartido={proximoPartido} />

<LatestResults partidos={ultimosResultados} />

<QuickActions />

    </div>
  </>
);
}