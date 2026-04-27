const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Treat better-sqlite3 as external so webpack doesn't bundle it
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...externals, 'better-sqlite3'];
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
