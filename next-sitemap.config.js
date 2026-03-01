const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://perpusmipada.vercel.app';

/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl,
    generateRobotsTxt: true,
    sitemapSize: 7000,
    exclude: ['/admin/*', '/api/*'],
    changefreq: 'daily',
    priority: 0.7,
    robotsTxtOptions: {
        policies: [
            {
                userAgent: '*',
                allow: '/',
            },
            {
                userAgent: '*',
                disallow: ['/admin', '/api'],
            },
        ],
    },
    transform: async (config, path) => {
        const entry = {
            loc: path,
            changefreq: config.changefreq,
            priority: config.priority,
            lastmod: new Date().toISOString(),
        };

        if (path === '/') {
            entry.priority = 1.0;
        } else if (path.startsWith('/detail')) {
            entry.priority = 0.9;
        } else if (path.startsWith('/categories')) {
            entry.priority = 0.8;
        }

        return entry;
    },
};
