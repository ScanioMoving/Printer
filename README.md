# Warehouse Label Printer (Next.js + App Router)

Simple single-user browser app for printing **4in x 3in** warehouse labels to a Zebra ZD621 using `window.print()`.

## Features

- Single label print mode (Designer, Project #, Item, Inventory #)
- Batch queue mode (manual add)
- CSV import (4 columns) for batch queue
- Edit/delete queue rows before printing
- Select specific queue labels and print **selected only**
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
2. Click `Print Label`, `Print Selected`, or `Print All`.
3. In browser print dialog:
- Select Zebra ZD621 printer
- Paper/label size: **4in x 3in**
- Margins: **None / 0**
- Scale: **100%**

## CSV format

- 4 columns in this order: `Designer, Project #, Item, Inventory #`
- Optional header row is supported.

Example:

```csv
Designer,Project #,Item,Inventory #
Jane Smith,PRJ-4421,Side Table,INV-0087
Ben Carter,PRJ-4472,Desk Lamp,INV-0119
```

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
