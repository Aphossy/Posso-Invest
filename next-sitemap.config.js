/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl:
    process.env.NEXT_PUBLIC_APP_URL || "https://posso-website.vercel.app",
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  changefreq: "daily",
  priority: 0.7,
  sitemapSize: 5000,
  exclude: ["/admin/*", "/api/*", "/private/*", "/404", "/500"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/private/"],
      },
    ],
    additionalSitemaps: [
      // Add additional sitemaps if needed
      // 'https://example.com/my-custom-sitemap-1.xml',
      // 'https://example.com/my-custom-sitemap-2.xml',
    ],
  },
  transform: async (config, path) => {
    // Custom transform function to modify sitemap entries
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    }
  },
}
