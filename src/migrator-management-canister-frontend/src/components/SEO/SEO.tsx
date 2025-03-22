import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  ogUrl?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  canonicalUrl?: string;
  schema?: Record<string, any>; // For structured data
}

const SEO = ({
  title,
  description,
  keywords = "Internet Computer, website migration, web hosting, canister, ICP",
  ogTitle,
  ogDescription,
  ogType = "website",
  ogUrl = "https://worldcloud.app",
  twitterCard = "summary_large_image",
  twitterTitle,
  twitterDescription,
  canonicalUrl = "https://worldcloud.app",
  schema,
}: SEOProps) => {
  // Default schema for a SaaS product
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "WORLDCLOUD",
    applicationCategory: "WebApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: description,
  };

  const schemaData = schema || defaultSchema;

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* OpenGraph / Facebook */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={ogUrl} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={twitterTitle || ogTitle || title} />
      <meta
        name="twitter:description"
        content={twitterDescription || ogDescription || description}
      />

      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Structured Data / Schema.org */}
      <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
    </Helmet>
  );
};

export default SEO;
