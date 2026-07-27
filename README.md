# Warehouse Label Batch Printer (Next.js + App Router)

Simple single-user browser app for printing **4in x 3in** warehouse labels to a Zebra ZD621 using `window.print()`.

## Label Format

Each label prints as:

- Company (`Scanio`, `Montia`, or `Sea&Air`)
- Reference text in the top-right corner
- Project Name
- Project Address
- Large bold number at the bottom

## Features

- Company selector buttons (`Scanio` / `Montia` / `Sea&Air`)
- Reference field (printed top-right on each label)
- Project Name field
- Project Address field
- Start Number + Label Count batch generation
- Auto-generate incremental labels (e.g. start `1250`, count `11` -> `1250` to `1260`)
- Select specific numbers before printing
- Print selected or print all generated
- Print-only layout with exact **4in x 3in** labels, one per page
- `@media print` hides UI and prints only labels

## Stack

- Next.js (App Router)
- Tailwind CSS
- Client-side React state only (no DB, auth, or localStorage)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Print setup

1. Pick company and fill project fields.
2. Enter Start Number and Label Count.
3. Click `Generate Labels`.
4. Select/unselect specific numbers if needed.
5. Click `Print Selected` or `Print All Generated`.
6. In browser print dialog:
- Select Zebra ZD621 printer
- Paper/label size: **4in x 3in**
- Margins: **None / 0**
- Scale: **100%**

### macOS direct Zebra printing

The Mac buttons send exact 4in × 3in ZPL directly to the Zebra at 203 dpi. This
bypasses the macOS print dialog, CUPS rotation, and automatic page scaling.

1. [Install and run Zebra Browser Print for macOS](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html).
2. In Browser Print settings, choose the ZD621 as the default printer.
3. Open `https://localhost:9101/ssl_support` once in the printing browser and
   accept the local certificate.
4. Approve the deployed website when Browser Print asks for permission.
5. Use `Mac: Print Selected Direct` or `Mac: Print All Direct`.

Windows continues to use the existing system print flow.

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
