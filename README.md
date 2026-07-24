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
- Print orientation controls for normal, 90-degree left, and 90-degree right output
- Mac defaults to Rotate Left while Windows defaults to Normal
- The selected orientation is remembered on each computer
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

Use **Normal (Windows)** for the existing Windows setup. On macOS, start with **Rotate Left (Mac)**.
If the print preview rotates in the opposite direction, select **Rotate Right (Mac)** instead. The site
remembers the selected orientation on that computer.

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
