import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | StudioFlows",
  description: "Privacy Policy for the StudioFlows marketing website.",
};

const SECTIONS = [
  {
    title: "Information We Collect",
    body:
      "We may collect information you provide directly, such as your name, email address, company details, and any message you submit through forms on this website. We may also collect basic technical information like device type, browser, pages visited, and general usage analytics.",
  },
  {
    title: "How We Use Information",
    body:
      "We use information to operate and improve the StudioFlows website and authorized tools, respond to inquiries, provide requested functionality, evaluate interest in our services, communicate with you about requests or updates, and protect against misuse or security issues.",
  },
  {
    title: "Connected Accounts and Third-Party Platforms",
    body:
      "If you choose to connect a third-party account, including LinkedIn, to an authorized StudioFlows tool, we may process the account identifiers, access credentials, and posting records needed to provide that connection. We use this information only to perform the function you authorize, secure and troubleshoot the connection, and comply with applicable law. We do not sell it. You may disconnect an account or request deletion by contacting us.",
  },
  {
    title: "How Information May Be Shared",
    body:
      "We may share information with service providers that help us run the website, manage communications, or support business operations. We may also disclose information when required by law or when reasonably necessary to protect our rights, users, or platform.",
  },
  {
    title: "Cookies and Analytics",
    body:
      "The website may use cookies, similar technologies, and analytics tools to understand traffic, remember preferences, and improve performance. You can usually control cookies through your browser settings.",
  },
  {
    title: "Data Retention and Security",
    body:
      "We retain information for as long as reasonably necessary to operate the website, fulfill requests, comply with legal obligations, and support legitimate business needs. No online system is completely secure, but we use reasonable administrative and technical measures to protect information.",
  },
  {
    title: "Your Choices",
    body:
      "You may choose not to submit certain information, though that may limit our ability to respond or provide services. If you want to request updates or deletion of information you previously submitted, contact us using the email below.",
  },
  {
    title: "Children's Privacy",
    body:
      "This website is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child has provided personal information, contact us so we can review and remove it if appropriate.",
  },
  {
    title: "Policy Updates",
    body:
      "We may update this Privacy Policy from time to time. When we do, we will post the revised version on this page and update the effective date below.",
  },
];

export default function PrivacyPolicyPage() {
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
            Effective Date: July 19, 2026
          </p>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">StudioFlows</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/65">
            This Privacy Policy describes how StudioFlows may collect, use, and share
            information when you visit the StudioFlows marketing website, submit a form,
            connect an authorized third-party account to a StudioFlows tool, or otherwise
            interact with StudioFlows.
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
            <h2 className="text-2xl font-semibold tracking-tight text-white">Contact Us</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              For privacy questions, support requests, or information update requests,
              contact{" "}
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
