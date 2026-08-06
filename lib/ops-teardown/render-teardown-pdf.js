import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const MARGIN_TOP = 720;
const MARGIN_BOTTOM = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const LINE_HEIGHT = 14;
const SECTION_GAP = 18;

const LOGO_CANDIDATES = [
  "StudioFlows logo (1200 x 675 px) (1).png",
  "StudioFlows logo white (1200 x 675 px).png",
];

function sanitizePdfText(text) {
  return String(text)
    .replace(/→/g, "->")
    .replace(/•/g, "-")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/[^\x00-\xFF]/g, "");
}

function wrapText(text, font, size, maxWidth) {
  const words = sanitizePdfText(text).split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function loadLogoBytes() {
  for (const filename of LOGO_CANDIDATES) {
    const logoPath = path.join(process.cwd(), "public", filename);
    if (fs.existsSync(logoPath)) {
      return fs.readFileSync(logoPath);
    }
  }
  return null;
}

function drawWatermark(page, logoImage, boldFont) {
  if (logoImage) {
    const width = 280;
    const height = (logoImage.height / logoImage.width) * width;
    page.drawImage(logoImage, {
      x: (PAGE_WIDTH - width) / 2,
      y: (PAGE_HEIGHT - height) / 2,
      width,
      height,
      opacity: 0.08,
    });
  }

  page.drawText("StudioFlows", {
    x: PAGE_WIDTH / 2 - 88,
    y: PAGE_HEIGHT / 2 - 10,
    size: 36,
    font: boldFont,
    color: rgb(0.82, 0.66, 0.33),
    opacity: 0.07,
  });
}

/**
 * @param {import("./build-teardown-sheet.js").OpsTeardownSheet} sheet
 */
export async function renderTeardownPdf(sheet) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${sheet.company_name} — Ops Teardown`);
  pdfDoc.setAuthor("StudioFlows");
  pdfDoc.setSubject("Ops Teardown");
  pdfDoc.setCreator("studioflows-marketing");

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoBytes = loadLogoBytes();
  const logoImage = logoBytes ? await pdfDoc.embedPng(logoBytes) : null;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawWatermark(page, logoImage, bold);
  let cursorY = MARGIN_TOP;

  const ensureSpace = (needed) => {
    if (cursorY - needed >= MARGIN_BOTTOM) return;
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawWatermark(page, logoImage, bold);
    cursorY = MARGIN_TOP;
  };

  const writeLines = (
    lines,
    { font = regular, size = 11, color = rgb(0.1, 0.1, 0.1), gap = LINE_HEIGHT } = {}
  ) => {
    for (const line of lines) {
      ensureSpace(gap);
      page.drawText(sanitizePdfText(line), { x: MARGIN_X, y: cursorY, size, font, color });
      cursorY -= gap;
    }
  };

  writeLines(["StudioFlows Ops Teardown"], { font: bold, size: 10, color: rgb(0.42, 0.33, 0.07) });
  writeLines([sheet.company_name], { font: bold, size: 22, gap: 26 });
  writeLines([sheet.ops_drag_title], { font: bold, size: 14, color: rgb(0.2, 0.16, 0.05), gap: 18 });
  writeLines(wrapText(sheet.ops_drag_summary, regular, 11, CONTENT_WIDTH));

  if (sheet.ops_drag_score != null) {
    writeLines([`Ops Drag Snapshot: ${sheet.ops_drag_score} / ${sheet.ops_drag_max}`], {
      font: regular,
      size: 10,
      color: rgb(0.35, 0.32, 0.28),
    });
  }

  cursorY -= SECTION_GAP;

  for (const section of sheet.sections.filter((item) => item.id !== "cover")) {
    ensureSpace(40);
    writeLines([section.title], { font: bold, size: 13, gap: 18 });
    writeLines(wrapText(section.body, regular, 11, CONTENT_WIDTH));

    if (Array.isArray(section.bullets)) {
      for (const bullet of section.bullets) {
        const bulletLines = wrapText(`• ${bullet}`, regular, 11, CONTENT_WIDTH - 8);
        writeLines(bulletLines, { size: 11, gap: 13 });
      }
    }

    cursorY -= 8;
  }

  ensureSpace(30);
  writeLines(["Confidential — prepared by StudioFlows"], {
    size: 9,
    color: rgb(0.45, 0.42, 0.38),
    gap: 12,
  });
  writeLines([`Generated ${new Date(sheet.generated_at).toLocaleString("en-US")}`], {
    size: 9,
    color: rgb(0.45, 0.42, 0.38),
  });

  return Buffer.from(await pdfDoc.save());
}
