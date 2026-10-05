import "./globals.css";

import { SiteEntityScript } from "./SiteEntityScript";
import { publicPageMetadata, PUBLIC_SITE_ORIGIN, SITE_POSITIONING } from "@/lib/seo";

const siteMetadata = publicPageMetadata({ ...SITE_POSITIONING, path: "/" });

export const metadata = {
  metadataBase: new URL(PUBLIC_SITE_ORIGIN),
  title: {
    default: `${SITE_POSITIONING.title} | StudioFlows`,
    template: "%s | StudioFlows",
  },
  description: SITE_POSITIONING.description,
  openGraph: siteMetadata.openGraph,
  twitter: siteMetadata.twitter,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <SiteEntityScript />
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
