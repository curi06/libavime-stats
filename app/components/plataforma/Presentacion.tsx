import Link from "next/link";

// Página de presentación de Quinteto Pro (para ligas que quieren unirse).
// Se muestra en /quinteto y, cuando el dominio sea de la plataforma, en "/".

const FUNCIONES = [
  {
    icono: "📊",
    titulo: "Estadísticas automáticas",
    texto: "Puntos, rebotes, asistencias, promedios y líderes de cada jugador y equipo, al instante.",
  },
  {
    icono: "📱",
    titulo: "Planilla en vivo",
    texto: "Tu anotador registra cada jugada desde el celular y el marcador se actualiza solo.",
  },
  {
    icono: "🎨",
    titulo: "Diseños para redes",
    texto: "Tarjetas de jugadores, líderes, posiciones y calendario listas para Instagram en un clic.",
  },
  {
    icono: "🏆",
    titulo: "Clasificación y resultados",
    texto: "Tabla de posiciones, box score de cada partido, finales y MVP de la temporada.",
  },
  {
    icono: "📅",
    titulo: "Calendario y temporadas",
    texto: "Programa los partidos y guarda cada temporada con su historial completo.",
  },
  {
    icono: "🛡️",
    titulo: "Tu marca, tu equipo",
    texto: "Tu logo, tus colores y tu dirección propia. Invita a tus administradores y anotadores.",
  },
];

const PASOS = [
  { titulo: "Solicita tu liga", texto: "Cuéntanos el nombre y la dirección que quieres. Es gratis." },
  { titulo: "Configúrala en minutos", texto: "Sube tu logo, registra equipos y jugadores, y programa los partidos." },
  { titulo: "Juega y comparte", texto: "La planilla en vivo alimenta las estadísticas y los diseños para tus redes." },
];

const PREGUNTAS = [
  {
    p: "¿Cuánto cuesta?",
    r: "Nada durante el lanzamiento. Si más adelante hay planes de pago, te avisaremos con tiempo y tus datos seguirán siendo tuyos.",
  },
  {
    p: "¿Necesito saber de tecnología?",
    r: "No. Todo se maneja desde el navegador del celular o la computadora, con formularios sencillos.",
  },
  {
    p: "¿Quién puede ver y cambiar los datos de mi liga?",
    r: "Todos pueden ver las páginas públicas; solo las personas que invites pueden administrar o llevar la planilla, y nadie de otra liga puede tocar tus datos.",
  },
  {
    p: "¿Sirve para cualquier tipo de liga?",
    r: "Sí: empresariales, de barrio, universitarias o de veteranos, con cualquier cantidad de equipos.",
  },
];

export default function Presentacion() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Portada */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 md:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(249,115,22,0.35), transparent 45%), radial-gradient(circle at 85% 30%, rgba(59,130,246,0.25), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-6xl">🏀</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight md:text-7xl">
            Quinteto <span className="text-orange-400">Pro</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300 md:text-2xl">
            La plataforma para ligas de baloncesto: estadísticas, planilla en vivo y diseños para
            redes sociales, con la marca de tu liga.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/registro"
              className="rounded-2xl bg-orange-500 px-8 py-4 text-lg font-black shadow-lg shadow-orange-500/30 transition hover:bg-orange-600"
            >
              Solicita tu liga gratis
            </Link>
            <Link
              href="/ligas"
              className="rounded-2xl border border-white/20 bg-white/5 px-8 py-4 text-lg font-black transition hover:bg-white/10"
            >
              Ver ligas en vivo
            </Link>
          </div>
        </div>
      </section>

      {/* Funciones */}
      <section className="bg-white px-4 py-16 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-black md:text-4xl">Todo lo que tu liga necesita</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FUNCIONES.map((f) => (
              <article key={f.titulo} className="rounded-3xl border border-slate-200 p-6 shadow-sm">
                <p className="text-4xl">{f.icono}</p>
                <h3 className="mt-3 text-xl font-black">{f.titulo}</h3>
                <p className="mt-2 text-slate-600">{f.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-slate-100 px-4 py-16 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-black md:text-4xl">Así de fácil</h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="rounded-3xl bg-white p-6 shadow">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-lg font-black text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-xl font-black">{paso.titulo}</h3>
                <p className="mt-2 text-slate-600">{paso.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Caso real */}
      <section className="px-4 py-16">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950 to-slate-900 p-8 text-center md:flex-row md:text-left">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo local */}
          <img src="/logos/LIBAVIME.png" alt="LIBAVIME" className="h-24 w-24 object-contain" />
          <div className="flex-1">
            <p className="text-sm font-black tracking-[0.2em] text-orange-300">LIGA EN QUINTETO PRO</p>
            <h2 className="mt-1 text-2xl font-black md:text-3xl">LIBAVIME · Santo Domingo</h2>
            <p className="mt-2 text-slate-300">
              La Liga de Baloncesto de Visitadores a Médicos lleva su temporada completa en Quinteto
              Pro: planilla en vivo, finales, MVP y diseños para Instagram.
            </p>
          </div>
          <Link href="/libavime" className="rounded-2xl bg-white px-6 py-3 font-black text-slate-900">
            Ver la liga →
          </Link>
        </div>
      </section>

      {/* Preguntas */}
      <section className="bg-white px-4 py-16 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-black md:text-4xl">Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {PREGUNTAS.map((q) => (
              <details key={q.p} className="group rounded-2xl border border-slate-200 p-5">
                <summary className="cursor-pointer list-none text-lg font-black">
                  {q.p}
                  <span className="float-right text-orange-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-slate-600">{q.r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Cierre */}
      <section className="px-4 py-16 text-center">
        <h2 className="text-3xl font-black md:text-4xl">¿Listos para el salto inicial?</h2>
        <p className="mt-3 text-slate-300">Gratis durante el lanzamiento.</p>
        <Link
          href="/registro"
          className="mt-6 inline-block rounded-2xl bg-orange-500 px-8 py-4 text-lg font-black shadow-lg hover:bg-orange-600"
        >
          Solicita tu liga
        </Link>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Quinteto Pro · <Link href="/ligas" className="underline">Ligas</Link> ·{" "}
        <Link href="/registro" className="underline">Solicitar cuenta</Link> ·{" "}
        <Link href="/login" className="underline">Iniciar sesión</Link>
      </footer>
    </main>
  );
}
