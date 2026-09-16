/**
 * Hybrid build. This app owns the proof-of-work routes only:
 *   /speaker /til /talks /contributions /research /about
 *
 * It must NOT emit /, /blog/**, /linux-foundation-coupon/**, /finops-coupon/**,
 * /coupons/ or /go/** — those stay owned by ../scripts/build-blog.mjs, which is
 * where the Awin link shapes, price maths and sale windows live. Two generators,
 * one output tree, strictly disjoint URL sets. `npm run export:verify` enforces
 * that the two never collide.
 *
 * `trailingSlash` is not cosmetic: every existing canonical, every sitemap <loc>
 * and all 25 /go/ redirects use a trailing slash. Emitting /speaker instead of
 * /speaker/ would fork the canonical for every new page.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: '.next',
  // GitHub Pages legacy build serves files as-is; there is no image optimizer
  // at the edge, so the Next loader has to be off or every <Image> 404s.
  images: { unoptimized: true },
  // The site is served from the domain root, alongside the generator's output.
  basePath: '',
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
