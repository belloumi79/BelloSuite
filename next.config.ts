import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders } from './src/lib/security-headers';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["gsap"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        // CSP + en-têtes de sécurité sur toutes les routes (pages et API)
        source: '/:path*',
        headers: securityHeaders(),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
