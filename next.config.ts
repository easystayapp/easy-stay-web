import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return ["/my-listings/:path*", "/profile/:path*", "/saved", "/notifications", "/owner/:path*", "/login", "/welcome", "/search"].map((source) => ({ source, headers: noindex }));
  },
};

export default nextConfig;
