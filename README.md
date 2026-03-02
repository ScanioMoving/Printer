# Warehouse Label Printer (Next.js + App Router)

Simple single-user browser app for printing **4in x 3in** warehouse labels to a Zebra ZD621 using `window.print()`.

## Features

- Single label print mode (4 fields)
- Batch queue mode (manual add)
- CSV import (4 columns) for batch queue
- Edit/delete queue rows before printing
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

1. Fill fields or queue labels.
2. Click `Print Label` or `Print All`.
3. In browser print dialog:
- Select Zebra ZD621 printer
- Paper/label size: **4in x 3in**
- Margins: **None / 0**
- Scale: **100%**

## CSV format

- 4 columns in this order: `Field 1, Field 2, Field 3, Field 4`
- Optional header row is supported.

Example:

```csv
Field 1,Field 2,Field 3,Field 4
Aisle 4,Bin 21,SKU-1001,Qty 12
Aisle 7,Bin 02,SKU-3008,Qty 3
```

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
