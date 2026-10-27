import { jsPDF } from "jspdf";

type WindowsLabel = {
  company: string;
  projectName: string;
  projectAddress: string;
  referenceText: string;
  number: number;
};

const INCH = 72;
const PAGE_WIDTH = 4 * INCH;
const PAGE_HEIGHT = 3 * INCH;

function drawText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  align: "left" | "center" | "right" = "left"
) {
  let size = fontSize;
  let lines: string[] = [];

  for (; size >= 4; size -= 0.5) {
    pdf.setFontSize(size);
    lines = pdf.splitTextToSize(text, width) as string[];
    if (lines.length * size * 1.05 <= height) {
      break;
    }
  }

  if (size < 4) {
    throw new Error("The project or reference text is too long to fit legibly on a label. Shorten it and print again.");
  }

  const anchor = align === "right" ? x + width : align === "center" ? x + width / 2 : x;
  pdf.text(lines, anchor, y, { baseline: "top", align, lineHeightFactor: 1.05 });
  return lines.length * size * 1.05;
}

export function createWindowsLabelPdf(labels: WindowsLabel[]): jsPDF {
  if (labels.length === 0) {
    throw new Error("Select at least one label to print.");
  }

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [PAGE_WIDTH, PAGE_HEIGHT],
    compress: true,
    putOnlyUsedFonts: true
  });
  pdf.setProperties({ title: "Warehouse labels - 4 x 3 inches" });
  // Request actual-size printing; the physical printer's paper setting still
  // needs to be 4 x 3 inches in the Windows print dialog.
  pdf.viewerPreferences({ PrintScaling: "None", PickTrayByPDFSize: true });

  labels.forEach((label, index) => {
    if (index > 0) {
      pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT], "landscape");
    }

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0);
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.03 * INCH);
    // Preserve the original 2.5-inch artwork, centered on 3-inch stock.
    // The small horizontal inset keeps the entire border on the printhead.
    pdf.rect(0.08 * INCH, 0.25 * INCH, 3.84 * INCH, 2.5 * INCH);

    const left = 0.24 * INCH;
    const top = 0.40 * INCH;
    const referenceLeft = 2.46 * INCH;
    pdf.setLineWidth(0.02 * INCH);
    pdf.rect(referenceLeft, top, 1.3 * INCH, 0.40 * INCH);

    drawText(pdf, label.company.toUpperCase(), left, top, 2.10 * INCH, 0.40 * INCH, 0.37 * INCH);
    drawText(pdf, "REFERENCE", referenceLeft + 4, top + 3, 1.3 * INCH - 8, 0.13 * INCH, 0.12 * INCH, "right");
    drawText(pdf, label.referenceText || "-", referenceLeft + 4, top + 14, 1.3 * INCH - 8, 0.18 * INCH, 0.17 * INCH, "right");
    const projectHeight = drawText(pdf, label.projectName, left, 0.88 * INCH, 3.52 * INCH, 0.48 * INCH, 0.23 * INCH);
    const addressTop = 0.88 * INCH + projectHeight + 0.04 * INCH;
    drawText(pdf, label.projectAddress, left, addressTop, 3.52 * INCH, 1.92 * INCH - addressTop, 0.20 * INCH);

    const numberText = `#${label.number}`;
    let numberSize = 0.78 * INCH;
    pdf.setFontSize(numberSize);
    while (pdf.getTextWidth(numberText) > 3.4 * INCH) {
      numberSize -= 0.5;
      pdf.setFontSize(numberSize);
    }
    pdf.text(numberText, PAGE_WIDTH / 2, 2.56 * INCH, { align: "center" });
  });

  return pdf;
}
