/** @type {import('next').NextConfig} */

// Imágenes permitidas: el almacenamiento público de cualquier proyecto de
// Supabase. Así no se cae la página si los datos traen fotos de otro
// proyecto (p. ej. una copia de producción en el proyecto de pruebas o un
// cambio de proyecto en el futuro).
const nextConfig = {
  allowedDevOrigins: ["172.20.10.2"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
