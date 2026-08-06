import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for the StudioFlows marketing website and SaaS services.",
  alternates: {
    canonical: "/terms-of-service",
  },
  openGraph: {
    title: "Terms of Service | StudioFlows",
    description: "Terms of Service for the StudioFlows marketing website and SaaS services.",
    url: "/terms-of-service",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | StudioFlows",
    description: "Terms of Service for the StudioFlows marketing website and SaaS services.",
  },
};

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    body:
      "By accessing or using the StudioFlows website or services, you agree to these Terms of Service. If you do not agree, do not use the website or services.",
  },
  {
    title: "Services",
    body:
      "StudioFlows provides software and related business services on a subscription or trial basis. We may modify, update, or discontinue features from time to time as the service evolves.",
  },
  {
    title: "Accounts and Access",
    body:
      "You may need to provide accurate information and maintain the confidentiality of your account credentials. You are responsible for activity that occurs under your account and for notifying us if you suspect unauthorized access.",
  },
  {
    title: "Acceptable Use",
    body:
      "You agree not to misuse the services, interfere with the platform, attempt unauthorized access, upload malicious code, violate applicable laws, or use the services in a way that harms StudioFlows, other users, or third parties.",
  },
  {
    title: "Fees and Payment",
    body:
      "Paid features may be offered on a recurring subscription or other pricing structure. Unless otherwise stated in a separate agreement, fees are due as billed and may be non-refundable except where required by law.",
  },
  {
    title: "Customer Data",
    body:
      "You retain rights to data you submit to the services, and you grant StudioFlows the limited rights necessary to host, process, transmit, and display that data in order to operate and improve the services.",
  },
  {
    title: "Intellectual Property",
    body:
      "The StudioFlows website, software, branding, content, and related materials are owned by StudioFlows or its licensors and are protected by applicable intellectual property laws. These Terms do not transfer ownership rights to you.",
  },
  {
    title: "Third-Party Services",
    body:
      "The services may integrate with or rely on third-party tools, platforms, or content. StudioFlows is not responsible for third-party services and does not guarantee their ongoing availability or performance.",
  },
  {
    title: "Disclaimers",
    body:
      "The services are provided on an as available and as is basis to the fullest extent permitted by law. StudioFlows disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation unless expressly stated otherwise in writing.",
  },
  {
    title: "Limitation of Liability",
    body:
      "To the fullest extent permitted by law, StudioFlows will not be liable for indirect, incidental, special, consequential, exemplary, or lost profits damages, or for loss of data, business interruption, or procurement of substitute services arising from or related to use of the website or services.",
  },
  {
    title: "Termination",
    body:
      "We may suspend or terminate access to the website or services if you violate these Terms, create risk for the platform, or where continued access is not operationally or legally appropriate. You may stop using the services at any time.",
  },
  {
    title: "Changes to Terms",
    body:
      "We may revise these Terms from time to time. Updated versions will be posted on this page with a revised effective date. Continued use of the website or services after changes become effective constitutes acceptance of the updated Terms.",
  },
];

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#050607] px-6 py-12 text-[#F5F7F7] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.24em] text-white/45 transition hover:text-white"
          >
            Back to Home
          </Link>
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">
            Effective Date: March 25, 2026
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">StudioFlows</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Terms of Service
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/65">
            These Terms of Service govern access to and use of the StudioFlows
            website and related software services. They are general terms for a SaaS
            business and may be supplemented by separate order forms, subscription
            terms, or written agreements where applicable.
          </p>

          <div className="mt-10 space-y-6">
            {SECTIONS.map((section) => (
              <section
                key={section.title}
                className="rounded-[22px] border border-white/8 bg-black/20 p-5 sm:p-6"
              >
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-white/60">{section.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-[22px] border border-emerald-400/20 bg-emerald-400/[0.05] p-5 sm:p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Contact</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              For questions about these Terms, contact{" "}
              <a
                href="mailto:support@studioflows.co"
                className="text-emerald-300 underline decoration-emerald-300/40 underline-offset-4"
              >
                support@studioflows.co
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
