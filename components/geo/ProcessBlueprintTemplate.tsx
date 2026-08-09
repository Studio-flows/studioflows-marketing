import {
  AuthorityLandingShell,
  MidpointAction,
} from "@/components/geo/AuthorityLandingShared";
import type { ProcessBlueprintPageDefinition } from "@/lib/geo/authority-pages";

type ProcessBlueprintTemplateProps = {
  page: ProcessBlueprintPageDefinition;
};

function ProcessStep({
  step,
}: {
  step: ProcessBlueprintPageDefinition["framework"][number];
}) {
  return (
    <li className="relative grid gap-4 border-l border-[#D4A853]/40 pb-9 pl-8 last:border-transparent last:pb-0 md:grid-cols-[minmax(11rem,0.55fr)_minmax(0,1fr)] md:gap-8 md:pl-10">
      <span
        className="absolute -left-[0.7rem] top-0 flex h-[1.4rem] w-[1.4rem] items-center justify-center rounded-full border border-[#D4A853] bg-[#0B0B0A] font-mono text-[8px] text-[#D4A853]"
        aria-hidden="true"
      >
        {step.number}
      </span>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">
          Stage {step.number}
        </p>
        <h3 className="mt-2 text-2xl text-white">{step.title}</h3>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
        <p className="text-base leading-7 text-white/68">{step.instruction}</p>
        <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-white/55">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#D4A853]">
            Proof to collect
          </span>
          <span className="mt-2 block">{step.evidence}</span>
        </p>
      </div>
    </li>
  );
}

export function ProcessBlueprintTemplate({ page }: ProcessBlueprintTemplateProps) {
  const readinessSteps = page.framework.slice(0, 3);
  const releaseSteps = page.framework.slice(3);

  return (
    <AuthorityLandingShell page={page} sectionTone="noir">
      <section id="artifact" aria-labelledby="artifact-heading" className="bg-[#0B0B0A]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#D4A853]">
                Execution artifact · Process blueprint
              </p>
              <h2 id="artifact-heading" className="mt-4 text-4xl tracking-[-0.03em] text-white sm:text-5xl">
                {page.frameworkName}
              </h2>
              <p className="mt-5 text-lg leading-8 text-white/65">{page.frameworkIntroduction}</p>
            </div>
            <dl className="grid gap-4 rounded-xl border border-[#D4A853]/25 bg-[#D4A853]/[0.06] p-5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">Entry state</dt>
                <dd className="mt-2 text-sm leading-6 text-white/72">{page.artifact.entryState}</dd>
              </div>
              <div className="border-t border-white/10 pt-4">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">Exit state</dt>
                <dd className="mt-2 text-sm leading-6 text-white/72">{page.artifact.exitState}</dd>
              </div>
            </dl>
          </div>

          <ol className="mt-12 max-w-5xl">
            {readinessSteps.map((step) => (
              <ProcessStep key={step.number} step={step} />
            ))}
          </ol>
        </div>

        <MidpointAction page={page} />

        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12">
          <ol start={4} className="max-w-5xl">
            {releaseSteps.map((step) => (
              <ProcessStep key={step.number} step={step} />
            ))}
          </ol>

          <aside aria-labelledby="release-record-heading" className="mt-14 rounded-2xl border border-[#D4A853]/30 bg-[#11100D] p-6 sm:p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#D4A853]">
              Worked release record
            </p>
            <h3 id="release-record-heading" className="mt-3 text-3xl text-white">
              Approval arrives, but the access promise is missing
            </h3>
            <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-2">
              <div className="bg-[#0D0D0C] p-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">Accepted basis</dt>
                <dd className="mt-3 text-sm leading-6 text-white/68">{page.artifact.releaseRecord.acceptedBasis}</dd>
              </div>
              <div className="bg-[#0D0D0C] p-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">Readiness blockers</dt>
                <dd className="mt-3">
                  <ul className="space-y-2 text-sm leading-6 text-white/68">
                    {page.artifact.releaseRecord.blockers.map((blocker) => (
                      <li key={blocker} className="flex gap-3">
                        <span className="text-[#D4A853]" aria-hidden="true">—</span>
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div className="bg-[#0D0D0C] p-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">Next owner</dt>
                <dd className="mt-3 text-sm leading-6 text-white/68">{page.artifact.releaseRecord.owner}</dd>
              </div>
              <div className="bg-[#0D0D0C] p-5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#D4A853]">Release proof</dt>
                <dd className="mt-3 text-sm leading-6 text-white/68">{page.artifact.releaseRecord.releaseProof}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section id="example" aria-labelledby="example-heading" className="border-y border-white/10 bg-[#10100E]">
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
