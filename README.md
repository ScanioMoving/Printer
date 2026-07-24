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
- Automatic macOS compensation for a Zebra CUPS queue configured with `orientation-requested=4`
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

On the Mac connected to the Zebra, configure the queue with:

```bash
lpoptions -o PageSize=w288h216 -o orientation-requested=4
```

The site detects macOS and sends a clockwise pre-rotated 3in x 4in logical page. CUPS rotates that
page counterclockwise onto the physical 4in x 3in label, preserving the full label without cropping.

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
