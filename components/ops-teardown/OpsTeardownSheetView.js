import {
  Q_BODY,
  Q_CARD,
  Q_EYEBROW,
  Q_HEADLINE,
} from "@/components/qualifier/qualifier-theme";

export default function OpsTeardownSheetView({ sheet, viewport = false }) {
  if (!sheet) return null;

  const shellClass = viewport
    ? "mt-5 max-h-[min(72vh,920px)] overflow-y-auto rounded-2xl border border-black/12 bg-[#F4F1EA] shadow-[0_24px_60px_rgba(11,11,12,0.12)]"
    : "mt-8 space-y-4";

  return (
    <div className={shellClass}>
      <div className={`${viewport ? "" : Q_CARD} overflow-hidden`}>
        <div className="border-b border-black/10 bg-[#0B0B0C] px-5 py-4 text-[#F4F1EA] sm:px-6">
          <p className={Q_EYEBROW}>StudioFlows Ops Teardown</p>
          <h2 className={`mt-2 text-xl sm:text-2xl ${Q_HEADLINE} text-[#F4F1EA]`}>{sheet.company_name}</h2>
          <p className="mt-2 text-sm text-[#D4A853]">{sheet.ops_drag_title}</p>
          <p className="mt-1 text-sm leading-6 text-white/80">{sheet.ops_drag_summary}</p>
          {sheet.ops_drag_score != null ? (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/65">
              Ops Drag Snapshot: {sheet.ops_drag_score} / {sheet.ops_drag_max}
            </p>
          ) : null}
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {sheet.sections
            .filter((section) => section.id !== "cover")
            .map((section) => (
              <section key={section.id} className="border-b border-black/8 pb-5 last:border-b-0 last:pb-0">
                <h3 className={`text-lg ${Q_HEADLINE}`}>{section.title}</h3>
                <p className={`mt-2 text-sm leading-7 ${Q_BODY}`}>{section.body}</p>
                {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
                  <ul className={`mt-3 list-disc space-y-2 pl-5 text-sm leading-7 ${Q_BODY}`}>
                    {section.bullets.map((bullet) => (
                      <li key={`${section.id}-${bullet}`}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
        </div>
      </div>

      {!viewport ? (
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B5212]/80">
          StudioFlows · Confidential Ops Teardown
        </p>
      ) : null}
    </div>
  );
}
