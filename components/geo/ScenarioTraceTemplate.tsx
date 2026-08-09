import {
  AuthorityLandingShell,
  MidpointAction,
} from "@/components/geo/AuthorityLandingShared";
import type { ScenarioTracePageDefinition } from "@/lib/geo/authority-pages";

type ScenarioTraceTemplateProps = {
  page: ScenarioTracePageDefinition;
};

export function ScenarioTraceTemplate({ page }: ScenarioTraceTemplateProps) {
  return (
    <AuthorityLandingShell page={page} sectionTone="editorial">
      <section id="artifact" aria-labelledby="artifact-heading" className="bg-[#F2EFE8] text-[#17130B]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8B641E]">
              Execution artifact · Scenario trace
            </p>
            <h2 id="artifact-heading" className="mt-4 text-4xl tracking-[-0.03em] sm:text-5xl">
              {page.frameworkName}
            </h2>
            <p className="mt-5 text-lg leading-8 text-black/65">{page.frameworkIntroduction}</p>
          </div>

          <ol aria-label="Change state sequence" className="mt-10 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            {[
              ["Baseline", page.artifact.baseline],
              ["Approved change", page.artifact.trigger],
              ["Confirmed version", page.artifact.outcome],
            ].map(([label, value], index) => (
              <li key={label} className="contents">
                <div className="rounded-xl border border-black/15 bg-white/55 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8B641E]">{label}</p>
                  <p className="mt-3 text-sm leading-6 text-black/70">{value}</p>
                </div>
                {index < 2 ? (
                  <span className="hidden text-xl text-[#8B641E] md:block" aria-hidden="true">→</span>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(15rem,0.65fr)_minmax(0,1.35fr)]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B641E]">Control trace</p>
              <ol className="mt-5 space-y-5 border-l border-black/20 pl-6">
                {page.framework.map((step) => (
                  <li key={step.number} className="relative">
                    <span className="absolute -left-[1.9rem] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#17130B] font-mono text-[8px] text-[#F2EFE8]">
                      {step.number}
                    </span>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/65">{step.instruction}</p>
                    <p className="mt-2 text-xs leading-5 text-black/50">
                      <span className="font-semibold text-black/65">Proof:</span> {step.evidence}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B641E]">Affected surfaces</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {page.artifact.surfaces.map((surface) => (
                  <article key={surface.name} className="rounded-xl border border-black/15 bg-white/60 p-5">
                    <h3 className="text-xl">{surface.name}</h3>
                    <dl className="mt-5 space-y-4 text-sm leading-6">
                      <div>
                        <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/45">Before</dt>
                        <dd className="mt-1 text-black/65">{surface.before}</dd>
                      </div>
                      <div className="border-t border-black/10 pt-4">
                        <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#8B641E]">Updated state</dt>
                        <dd className="mt-1 text-black/72">{surface.after}</dd>
                      </div>
                      <div className="grid gap-4 border-t border-black/10 pt-4 sm:grid-cols-2">
                        <div>
                          <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/45">Owner</dt>
                          <dd className="mt-1 text-black/65">{surface.owner}</dd>
                        </div>
                        <div>
                          <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/45">Verification</dt>
                          <dd className="mt-1 text-black/65">{surface.verification}</dd>
                        </div>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MidpointAction page={page} />

      <section id="example" aria-labelledby="example-heading" className="bg-[#0B0B0A]">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-12 lg:py-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#D4A853]">{page.exampleLabel}</p>
            <h2 id="example-heading" className="mt-4 text-3xl leading-tight text-white">{page.exampleTitle}</h2>
          </div>
          <div className="space-y-5 text-lg leading-8 text-white/65">
            {page.example.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </AuthorityLandingShell>
  );
}
