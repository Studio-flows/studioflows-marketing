import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.studioflows.co"),
  title: {
    default: "StudioFlows | Execution Infrastructure for Service Businesses",
    template: "%s | StudioFlows",
  },
  description:
    "StudioFlows turns scattered business signals into approved, trackable execution for service businesses.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StudioFlows | Execution Infrastructure for Service Businesses",
    description:
      "StudioFlows turns scattered business signals into approved, trackable execution for service businesses.",
    url: "https://www.studioflows.co",
    siteName: "StudioFlows",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "StudioFlows | Execution Infrastructure for Service Businesses",
    description:
      "StudioFlows turns scattered business signals into approved, trackable execution for service businesses.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-BLDEC2BG1R"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-BLDEC2BG1R');
`,
          }}
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
  (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "xqtuj2cs6o");
`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
