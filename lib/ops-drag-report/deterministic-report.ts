import {
  assertOpsDragReportContentAllowed,
  OPS_DRAG_REPORT_SCHEMA_VERSION,
  OPS_DRAG_REPORT_TEMPLATE_VERSION,
  type OpsDragReportDocument,
  type ReportGenerationAdapter,
} from "./delivery-refund-state-machine.ts";
import {
  assertOpsDragAdmittedSnapshotIntegrity,
  type OpsDragAdmittedSnapshot,
  type JsonValue,
} from "./order-foundation.ts";

function requireSnapshot(snapshot: OpsDragAdmittedSnapshot, submissionId: string, digest: string): void {
  try {
    assertOpsDragAdmittedSnapshotIntegrity(snapshot);
  } catch {
    throw new Error("Report generation snapshot digest is invalid");
  }
  if (snapshot.submission_id !== submissionId || snapshot.digest !== digest) {
    throw new Error("Report generation snapshot binding mismatch");
  }
}

function boundedText(value: JsonValue | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;
  const bounded = normalized.slice(0, 160);
  assertOpsDragReportContentAllowed(bounded);
  return bounded;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function buildDeterministicOpsDragReport(input: {
  orderId: string;
  submissionId: string;
  snapshotDigest: string;
  snapshot: OpsDragAdmittedSnapshot;
  generatedAt: string;
}): OpsDragReportDocument {
  requireSnapshot(input.snapshot, input.submissionId, input.snapshotDigest);
  if (!input.orderId.trim()) throw new Error("Report generation order binding is required");
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new Error("Report generation timestamp is invalid");

  const answers = input.snapshot.report_input.quizPayload;
  const pain = boundedText(answers.primaryPainArea, "day-to-day operating coordination");
  const bottleneck = boundedText(answers.highestCostBottleneck, "handoffs between people and systems");
  const breakdown = boundedText(answers.frequentBreakdown, "work losing context between steps");
  const workflow = boundedText(answers.workflowManagement, "the current workflow-management approach");
  const risk = boundedText(answers.quarterRisk, "delivery reliability and management visibility");

  const hypotheses = unique([
    `A likely friction hypothesis is that ${bottleneck} creates avoidable waiting or rework.`,
    `A likely friction hypothesis is that ${breakdown} is not consistently surfaced by ${workflow}.`,
    `A likely friction hypothesis is that pressure around ${pain} can make ${risk} harder to observe early.`,
  ]).slice(0, 3);

  return {
    schema_version: OPS_DRAG_REPORT_SCHEMA_VERSION,
    template_version: OPS_DRAG_REPORT_TEMPLATE_VERSION,
    order_id: input.orderId,
    submission_id: input.submissionId,
    generated_at: input.generatedAt,
    title: "StudioFlows Ops Drag Report",
    summary: `The submitted Ops Check points to ${pain} as the focused drag area. The report treats the signals below as bounded hypotheses for investigation, not established root causes.`,
    hypotheses,
    seven_day_sequence: [
      "Day 1: Confirm the named drag with one current work example and its intended outcome.",
      "Day 2: Trace the example from intake through completion and mark every handoff.",
      "Day 3: Record waiting, rework, missing context, and exception handling at each step.",
      "Day 4: Compare the observed path with the expected owner, system, and decision rule.",
      "Day 5: Select one reversible change that removes a verified source of friction.",
      "Day 6: Run the changed path once and capture timing, exceptions, and owner feedback.",
      "Day 7: Keep, revise, or reverse the change based on the collected operating evidence.",
    ],
    limitations: "This automated report uses only the submitted Ops Check snapshot. It identifies where to investigate first, treats every finding as a hypothesis, and includes operational information only.",
    evidence_to_collect: [
      "Elapsed time and waiting time for one representative work item.",
      "The owner and system responsible at each handoff.",
      "Exceptions, rework loops, and missing-information events.",
      "A before-and-after receipt for the selected reversible change.",
    ],
  };
}

function ascii(value: string): string {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "-");
}

function wrap(value: string, width = 92): string[] {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= width) line = next;
    else {
      if (line) lines.push(line);
      line = word.slice(0, width);
    }
  }
  if (line) lines.push(line);
  return lines;
}

function pdfString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function renderDeterministicOpsDragPdf(report: OpsDragReportDocument): Uint8Array {
  const sections = [
    report.title,
    "",
    "Focused drag summary",
    report.summary,
    "",
    "Likely friction hypotheses",
    ...report.hypotheses.map((value, index) => `${index + 1}. ${value}`),
    "",
    "Seven-day sequence",
    ...report.seven_day_sequence,
    "",
    "Evidence to collect",
    ...report.evidence_to_collect.map((value, index) => `${index + 1}. ${value}`),
    "",
    "Limitations",
    report.limitations,
  ];
  const lines = sections.flatMap((value) => value ? wrap(value) : [""]);
  const pageLines: string[][] = [];
  for (let index = 0; index < lines.length; index += 46) pageLines.push(lines.slice(index, index + 46));

  const objects: string[] = [];
  const pageIds = pageLines.map((_, index) => 4 + index * 2);
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  pageLines.forEach((page, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const commands = [
      "BT",
      "/F1 10 Tf",
      "50 750 Td",
      "13 TL",
      ...page.map((line) => `(${pdfString(line)}) Tj T*`),
      "ET",
    ].join("\n");
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(commands, "ascii")} >>\nstream\n${commands}\nendstream`;
  });

  let pdf = "%PDF-1.4\n%StudioFlows\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf, "ascii");
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "ascii"));
}

export function createDeterministicReportGenerationAdapter(): ReportGenerationAdapter {
  return {
    async generate(input) {
      const report = buildDeterministicOpsDragReport(input);
      return { report, pdfBytes: renderDeterministicOpsDragPdf(report) };
    },
  };
}
