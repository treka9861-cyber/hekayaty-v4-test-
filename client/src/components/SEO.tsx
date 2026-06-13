import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    schema?: any;
}

export function SEO({
    title,
    description,
    image,
    url,
    type = 'website',
    schema
}: SEOProps) {
    const { i18n, t } = useTranslation();
    const siteTitle = 'Hekayaty - حكاياتي';
    const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} | ${t("hero.tagline", "كل قاص يستحق عالماً")}`;
    const defaultDescription = t("hero.subtitle", "قم ببناء متجرك الرقمي، تواصل مع القراء، وبع قصصك مباشرة. الكون الخاص بالرواة وبناة العوالم.");
    const keywords = "storytelling, Arabic stories, novels, fantasy stories, Middle East creators, Hekayaty, حكاياتي, digital publishing, روايات عربية, قصص";
    
    const domain = typeof window !== 'undefined' ? window.location.origin : 'https://hekayaty.com';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const canonical = url || `${domain}${path}`;

    // Organization Schema
    const orgSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": siteTitle,
        "url": domain,
        "logo": `${domain}/favicon.png`,
        "sameAs": [
            "https://twitter.com/Hekayaty",
            "https://facebook.com/Hekayaty",
            "https://instagram.com/Hekayaty"
        ]
    };

    // Breadcrumb Schema
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": i18n.language === 'ar' ? 'الرئيسية' : 'Home',
                "item": domain
            },
            title ? {
                "@type": "ListItem",
                "position": 2,
                "name": title,
                "item": canonical
            } : null
        ].filter(Boolean)
    };

    // Use absolute URL for the image
    const getAbsoluteImageUrl = (img?: string) => {
        if (!img) return `${domain}/og-image.png`;
        if (img.startsWith('http')) return img;
        return `${domain}${img.startsWith('/') ? '' : '/'}${img}`;
    };

    const ogImage = getAbsoluteImageUrl(image);

    return (
        <Helmet>
            <html lang={i18n.language} />
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description || defaultDescription} />
            <meta name="keywords" content={keywords} />
            <meta name="author" content="Hekayaty" />
            <link rel="canonical" href={canonical} />

            {/* hreflang for International SEO */}
            <link rel="alternate" href={`${domain}/?hl=en`} hrefLang="en" />
            <link rel="alternate" href={`${domain}/?hl=ar`} hrefLang="ar" />
            <link rel="alternate" href={`${domain}/`} hrefLang="x-default" />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:site_name" content="Hekayaty" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description || defaultDescription} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:url" content={canonical} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@Hekayaty" />
            <meta name="twitter:creator" content="@Hekayaty" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description || defaultDescription} />
            <meta name="twitter:image" content={ogImage} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(orgSchema)}
            </script>
            <script type="application/ld+json">
                {JSON.stringify(breadcrumbSchema)}
            </script>
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
}
