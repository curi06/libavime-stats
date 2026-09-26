/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["172.20.10.2"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ialqgoofturuqrsdfwrl.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

module.exports = nextConfig;
