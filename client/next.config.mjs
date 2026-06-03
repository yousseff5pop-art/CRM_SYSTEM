const nextConfig = {
  async rewrites() {
    const apiOrigin = process.env.CRM_API_ORIGIN || "http://localhost:3001";

    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
