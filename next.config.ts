import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: '/smart-social',
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
