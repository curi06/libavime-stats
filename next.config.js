/** @type {import('next').NextConfig} */

// Imágenes permitidas: el almacenamiento del proyecto de Supabase en uso
// (producción o pruebas), tomado de la configuración en vez de fijarlo.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "ialqgoofturuqrsdfwrl.supabase.co";
  }
})();

const nextConfig = {
  allowedDevOrigins: ["172.20.10.2"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
