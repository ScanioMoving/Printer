# Warehouse Label Batch Printer (Next.js + App Router)

Simple single-user browser app for printing **4in x 3in** warehouse labels to a Zebra ZD621 using `window.print()`.

## Label Format

Each label prints as:

- Company (`Scanio` or `Montia`)
- Project Name
- Project Address
- Large bold number at the bottom

## Features

- Company selector buttons (`Scanio` / `Montia`)
- Project Name field
- Project Address field
- Start Number + End Number batch generation
- Auto-generate full inclusive range (e.g. `1250` to `1260`)
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
2. Enter Start Number and End Number.
3. Click `Generate Range`.
4. Select/unselect specific numbers if needed.
5. Click `Print Selected` or `Print All Generated`.
6. In browser print dialog:
- Select Zebra ZD621 printer
- Paper/label size: **4in x 3in**
- Margins: **None / 0**
- Scale: **100%**

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
