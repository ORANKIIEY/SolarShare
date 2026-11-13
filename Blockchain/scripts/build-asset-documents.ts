// Builds the three SAMPLE asset documents for issue #27 and hashes them.
//
//   npm run docs:build
//
// Output: docs/asset-documents/*.pdf and hashes.json (repo root).
// Every page carries a large "SAMPLE: NOT A REAL DOCUMENT" watermark. All
// people, companies, numbers and addresses are fictional.
//
// The build is deterministic (fixed dates, built-in fonts only), so rebuilding
// unchanged text gives byte-identical files and the same hashes.
import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { ASSET_DOCUMENTS, DOCS_DIR, REPO_ROOT, writeHashes, type AssetDocumentSpec } from "./lib/assetDocuments";

const FIXED_DATE = new Date("2026-11-01T08:00:00Z");
const WATERMARK = "SAMPLE: NOT A REAL DOCUMENT";
const INK = "#1f2933";
const MUTED = "#52606d";
const ACCENT = "#b7791f";
const RED = "#c53030";

type Doc = PDFKit.PDFDocument;

// ------------------------------------------------------------------ layout

function newDoc(title: string): Doc {
  return new PDFDocument({
    size: "A4",
    margins: { top: 90, bottom: 80, left: 64, right: 64 },
    bufferPages: true,
    info: {
      Title: `${title} (SAMPLE)`,
      Author: "SolarShare hackathon demo",
      Subject: WATERMARK,
      Keywords: "sample, fictional, demo, not a real document",
      CreationDate: FIXED_DATE,
      ModDate: FIXED_DATE,
    },
  });
}

const contentWidth = (doc: Doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

function heading(doc: Doc, title: string, subtitle: string) {
  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9).text("SOLAR SHARE BLOCK A SPV (PTY) LTD  ·  SAMPLE DOCUMENT", { characterSpacing: 1 });
  doc.moveDown(0.6);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(20).text(title);
  doc.fillColor(MUTED).font("Helvetica").fontSize(10.5).text(subtitle);
  doc.moveDown(0.4);
  const y = doc.y;
  doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).lineWidth(1).strokeColor(ACCENT).stroke();
  doc.moveDown(1);
}

function section(doc: Doc, title: string) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 80) doc.addPage();
  doc.moveDown(0.6);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(12).text(title);
  doc.moveDown(0.3);
}

function para(doc: Doc, text: string) {
  doc.fillColor(INK).font("Helvetica").fontSize(10).text(text, { align: "left", lineGap: 2 });
  doc.moveDown(0.5);
}

function bullets(doc: Doc, items: string[]) {
  doc.fillColor(INK).font("Helvetica").fontSize(10);
  for (const item of items) doc.text(`•  ${item}`, { indent: 0, lineGap: 2 });
  doc.moveDown(0.5);
}

/** Two-column label/value table. */
function fields(doc: Doc, rows: Array<[string, string]>) {
  const left = doc.page.margins.left;
  const labelW = 170;
  const valueW = contentWidth(doc) - labelW - 10;
  for (const [label, value] of rows) {
    const h = Math.max(
      doc.font("Helvetica-Bold").fontSize(9.5).heightOfString(label, { width: labelW }),
      doc.font("Helvetica").fontSize(10).heightOfString(value, { width: valueW }),
    );
    if (doc.y + h > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9.5).text(label, left, y, { width: labelW });
    doc.fillColor(INK).font("Helvetica").fontSize(10).text(value, left + labelW + 10, y, { width: valueW });
    doc.y = y + h + 5;
    doc.x = left;
  }
  doc.moveDown(0.4);
}

/** Simple table with a header row. */
function table(doc: Doc, headers: string[], widths: number[], rows: string[][]) {
  const left = doc.page.margins.left;
  const rowH = 16;
  const drawRow = (cells: string[], bold: boolean) => {
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawRow(headers, true);
    }
    const y = doc.y;
    if (bold) doc.rect(left, y - 2, widths.reduce((a, b) => a + b, 0), rowH).fill("#f5efe3");
    let x = left;
    cells.forEach((cell, i) => {
      doc.fillColor(INK).font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).text(cell, x + 3, y + 2, {
        width: widths[i] - 6,
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i];
    });
    doc.y = y + rowH;
    doc.x = left;
  };
  drawRow(headers, true);
  for (const r of rows) drawRow(r, false);
  doc.moveDown(0.6);
}

function signatures(doc: Doc, signers: Array<[string, string]>) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 110) doc.addPage();
  doc.moveDown(1.2);
  const left = doc.page.margins.left;
  const colW = contentWidth(doc) / signers.length;
  const y = doc.y + 30;
  signers.forEach(([name, role], i) => {
    const x = left + i * colW;
    doc.moveTo(x, y).lineTo(x + colW - 24, y).lineWidth(0.7).strokeColor(MUTED).stroke();
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5).text(name, x, y + 5, { width: colW - 24 });
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.5).text(role, x, doc.y, { width: colW - 24 });
    doc.fillColor(RED).font("Helvetica-Oblique").fontSize(8).text("Specimen signature line: not signed", x, doc.y + 2, { width: colW - 24 });
  });
  doc.y = y + 60;
  doc.x = left;
}

/** Watermark, banner and footer on every page (drawn last, on top). */
function stampEveryPage(doc: Doc, docTitle: string) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const { width, height } = doc.page;
    // pdfkit adds a new page when text goes past the bottom margin, even for
    // absolutely positioned text. Drop the margin while stamping.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    // Big diagonal watermark.
    doc.save();
    doc.rotate(-52, { origin: [width / 2, height / 2] });
    doc.fillColor(RED).fillOpacity(0.15).font("Helvetica-Bold").fontSize(110);
    doc.text("SAMPLE", 0, height / 2 - 90, { width, align: "center", lineBreak: false });
    doc.fontSize(44).text("NOT A REAL DOCUMENT", 0, height / 2 + 40, { width, align: "center", lineBreak: false });
    doc.restore();

    // Top banner.
    doc.save();
    doc.rect(0, 0, width, 34).fillOpacity(1).fill(RED);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(12).text(WATERMARK, 0, 11, { width, align: "center", lineBreak: false });
    doc.restore();

    // Footer.
    doc.save();
    doc.fillOpacity(1).fillColor(MUTED).font("Helvetica").fontSize(7.5);
    doc.text(
      `${docTitle}  ·  Fictional sample made for the SolarShare hackathon demo. No legal effect. Page ${i + 1} of ${range.count}`,
      64,
      height - 46,
      { width: width - 128, align: "center", lineBreak: false },
    );
    doc.restore();
    doc.page.margins.bottom = bottom;
  }
}

// --------------------------------------------------------------- documents

const COMPANY = "Solar Share Block A SPV (Pty) Ltd";
const REG_NO = "2026/555014/07 (fictional)";
const SITE = "Erf 1201, Block A, Ubuntu Heights (a fictional township), Gauteng, South Africa";

function spvCertificate(doc: Doc) {
  heading(doc, "Certificate of Incorporation", `Private company: ${COMPANY}`);
  para(
    doc,
    "This sample certificate shows the kind of record that would prove who legally owns the solar mini-grid. " +
      "It was not issued by any companies registry. It is a fictional illustration for a hackathon demo.",
  );
  section(doc, "Company details");
  fields(doc, [
    ["Company name", COMPANY],
    ["Registration number", REG_NO],
    ["Type", "Private company (Pty) Ltd, special purpose vehicle (SPV)"],
    ["Date of incorporation", "3 August 2026"],
    ["Registered office", "Unit 4, 17 Example Street, Sampleton, Gauteng, 0000 (fictional)"],
    ["Financial year end", "28 February"],
    ["Sole business", `Owning and operating one 10 kWp solar and battery mini-grid at ${SITE}`],
  ]);
  section(doc, "Directors (fictional people)");
  table(
    doc,
    ["Name", "Role", "Appointed", "ID number"],
    [150, 140, 90, 87],
    [
      ["Naledi Specimen", "Director, chairperson", "3 Aug 2026", "SAMPLE-0001"],
      ["Thabo Example", "Director, operations", "3 Aug 2026", "SAMPLE-0002"],
      ["Ayesha Placeholder", "Director, finance", "3 Aug 2026", "SAMPLE-0003"],
    ],
  );
  section(doc, "Share capital");
  fields(doc, [
    ["Authorised shares", "3,500 ordinary shares of no par value"],
    ["Issued so far", "Recorded live onchain (SolarShareToken.totalSupply)"],
    ["Share register", "SolarShareToken \"Block A Solar Share\" (SSBA) on Base Sepolia, a public test network. One token = one ordinary share."],
    ["Who may hold shares", "Only wallets approved by the company's KYC officer (SolarShareToken.isApproved)"],
    ["Distributions", "Net energy income is paid to shareholders pro rata in USDC through RevenueDistributor, and only while the meter status is OK"],
  ]);
  section(doc, "Memorandum of incorporation: key clauses (summary)");
  bullets(doc, [
    "The company may not take on any business other than the Block A mini-grid.",
    "The company may not borrow against the mini-grid without a special resolution of shareholders (75%).",
    "Shares may only be transferred between approved wallets. The KYC officer may freeze a wallet by court order or on proof of fraud.",
    "A lost wallet may be replaced: the board may move its shares and unpaid income to a new approved wallet (SolarShareToken.recover).",
  ]);
  signatures(doc, [
    ["Naledi Specimen", "Director"],
    ["Thabo Example", "Director"],
  ]);
}

function installationCertificate(doc: Doc) {
  heading(doc, "Installation Certificate", "10 kWp solar PV and battery mini-grid, Block A");
  para(
    doc,
    "This sample certificate shows the kind of record an installer gives when a solar system is finished and tested. " +
      "The installer, people and serial numbers are fictional.",
  );
  section(doc, "Installation");
  fields(doc, [
    ["Certificate number", "INST-2026-0042-SAMPLE"],
    ["Owner", `${COMPANY}, ${REG_NO}`],
    ["Site", SITE],
    ["GPS (approximate, fictional)", "-25.7000, 28.3000"],
    ["Installer", "Example Solar Installers (Pty) Ltd (fictional)"],
    ["Installation completed", "12 October 2026"],
    ["Commissioned (first power)", "14 October 2026"],
  ]);
  section(doc, "Equipment");
  table(
    doc,
    ["Item", "Specification", "Qty", "Serial numbers"],
    [120, 190, 35, 122],
    [
      ["PV modules", "500 W monocrystalline, half-cell", "20", "PV-SAMPLE-001 to 020"],
      ["Array size", "20 × 500 W = 10.0 kWp", "", ""],
      ["Hybrid inverter", "10 kW, 3-phase, grid-forming", "1", "INV-SAMPLE-7781"],
      ["Battery", "LiFePO4, 20 kWh usable", "1", "BAT-SAMPLE-3310"],
      ["Mounting", "Ground mount, 25° tilt, north-facing", "1", ""],
      ["Distribution", "Prepaid smart meters, one per customer", "25", "PM-SAMPLE-01 to 25"],
      ["Production meter", "ESP32 signing meter, meter id 1", "1", "MTR-SAMPLE-0001"],
    ],
  );
  section(doc, "Production meter (the data source for payouts)");
  fields(doc, [
    ["Meter id", "1"],
    ["Signing address", "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3 (TEST key, Wokwi simulation)"],
    ["What it signs", "Energy produced (Wh), energy sold (Wh), power (W), tamper switch, sequence number, time (EIP-712)"],
    ["Where readings go", "MeterOracle smart contract on Base Sepolia, via the SolarShare relayer"],
  ]);
  section(doc, "Tests on completion (sample results)");
  table(
    doc,
    ["Test", "Result", "Pass"],
    [220, 190, 57],
    [
      ["Insulation resistance, DC strings", "> 40 megohm", "Yes"],
      ["Open-circuit voltage, per string", "Within 2% of design", "Yes"],
      ["Earth continuity", "< 0.5 ohm", "Yes"],
      ["Inverter anti-islanding", "Disconnects in < 2 s", "Yes"],
      ["Battery full charge / discharge cycle", "19.6 kWh delivered", "Yes"],
      ["Meter signature check", "Readings verify onchain", "Yes"],
    ],
  );
  section(doc, "Declaration");
  para(
    doc,
    "The installer declares that the system above was installed and tested in line with the applicable South African wiring " +
      "and embedded-generation standards. (Sample wording only: this declaration was not made by anyone.)",
  );
  signatures(doc, [
    ["Sipho Sample", "Registered electrician (fictional)"],
    ["Thabo Example", "For the owner"],
  ]);
}

function powerPurchaseAgreement(doc: Doc) {
  heading(doc, "Power Purchase Agreement", "Block A community mini-grid: 20 homes and 5 spaza shops");
  para(
    doc,
    "This sample agreement shows how the mini-grid earns its income: neighbours buy the electricity it makes. " +
      "All customers, stands and amounts are fictional.",
  );
  section(doc, "Parties");
  fields(doc, [
    ["Seller", `${COMPANY}, ${REG_NO}`],
    ["Buyers", "The 25 customers listed in Schedule A (20 households and 5 spaza shops)"],
    ["Agreement number", "PPA-BLOCKA-2026-SAMPLE"],
    ["Start date", "1 November 2026"],
    ["Term", "10 years, renewable"],
  ]);
  section(doc, "Key terms");
  bullets(doc, [
    "Tariff: USD 0.20 per kWh, the same for every customer, reviewed once a year. For the demo it is settled in test USDC (RevenueDistributor.tariffUsdcPerKwh = 0.20).",
    "Customers prepay for electricity through their prepaid meters. No contract is needed for a customer to stop buying.",
    "The seller may only pay income to shareholders for energy the production meter shows as sold (RevenueDistributor.depositCap).",
    "If the meter shows more than 15% of the energy produced as unpaid for (THEFT), or the meter is opened (TAMPER) or silent (OFFLINE), payouts pause until the cause is fixed.",
    "Planned outages are announced 48 hours ahead. Faults are attended to within 24 hours.",
    "Disputes go first to a community meeting, then to mediation.",
  ]);
  section(doc, "Schedule A: customers");
  const rows: string[][] = [];
  let dailyKwh = 0;
  for (let i = 1; i <= 20; i++) {
    const n = String(i).padStart(2, "0");
    const kwh = 1.2 + 0.2 * (i % 4);
    dailyKwh += kwh;
    rows.push([`H-${n}`, "Household", `Stand ${1200 + i}, Block A`, `PM-SAMPLE-${n}`, `${kwh.toFixed(1)} kWh`]);
  }
  const shops = ["Spaza Shop One", "Spaza Shop Two", "Spaza Shop Three", "Spaza Shop Four", "Spaza Shop Five"];
  shops.forEach((shop, j) => {
    const n = String(21 + j).padStart(2, "0");
    const kwh = 2.5 + j * 0.5;
    dailyKwh += kwh;
    rows.push([`S-0${j + 1}`, `Spaza shop: "${shop}"`, `Stand ${1230 + j}, Block A`, `PM-SAMPLE-${n}`, `${kwh.toFixed(1)} kWh`]);
  });
  table(doc, ["Code", "Customer", "Address (fictional)", "Prepaid meter", "Avg. daily use"], [45, 145, 120, 85, 72], rows);
  para(
    doc,
    `Expected total demand: about ${Math.round(dailyKwh)} kWh per day. A 10 kWp array in Gauteng makes about 45 to 50 kWh ` +
      "on an average day; the 20 kWh battery carries daytime surplus into the evening.",
  );
  signatures(doc, [
    ["Naledi Specimen", "For the seller"],
    ["Community representative", "For the buyers (fictional)"],
  ]);
}

const BUILDERS: Record<AssetDocumentSpec["name"], (doc: Doc) => void> = {
  SPV_CERTIFICATE: spvCertificate,
  INSTALLATION_CERTIFICATE: installationCertificate,
  POWER_PURCHASE_AGREEMENT: powerPurchaseAgreement,
};

async function build(spec: AssetDocumentSpec) {
  const file = path.join(DOCS_DIR, spec.file);
  const doc = newDoc(spec.title);
  const done = new Promise<void>((resolve, reject) => {
    const out = fs.createWriteStream(file);
    out.on("finish", resolve);
    out.on("error", reject);
    doc.pipe(out);
  });
  BUILDERS[spec.name](doc);
  stampEveryPage(doc, spec.title);
  doc.end();
  await done;
}

async function main() {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
  for (const spec of ASSET_DOCUMENTS) await build(spec);
  const hashes = writeHashes();
  for (const d of hashes.documents) {
    console.log(`${d.name.padEnd(25)} ${d.sha256}  ${path.relative(REPO_ROOT, path.join(DOCS_DIR, d.file))}`);
  }
  console.log(`\nWrote ${path.relative(REPO_ROOT, path.join(DOCS_DIR, "hashes.json"))}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
