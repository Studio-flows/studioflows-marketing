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
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PF3Q8MJ5');
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
      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PF3Q8MJ5"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          ></iframe>
        </noscript>
        {children}
      </body>
    </html>
  );
}
