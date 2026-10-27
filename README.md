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

The Mac buttons detect the Zebra printhead resolution and send exact 4in × 3in
ZPL at either 203 dpi (812 × 609 dots) or 300 dpi (1200 × 900 dots). This
bypasses the macOS print dialog, CUPS rotation, and automatic page scaling.
The direct ZPL uses the same centered 4in × 2.5in artwork proportions as the
established Windows labels.

1. [Install and run Zebra Browser Print for macOS](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html).
2. In Browser Print settings, choose the ZD621 as the default printer.
3. Open `https://localhost:9101/ssl_support` once in the printing browser and
   accept the local certificate.
4. Approve the deployed website when Browser Print asks for permission.
5. Use `Mac: Print Selected Direct` or `Mac: Print All Direct`.

If the printer is unplugged or moved to another USB port, the site discovers the
currently connected Zebra again before printing instead of relying only on
Browser Print's previously saved device ID.

### Windows printing

Use `Windows Print` for the selected labels or `Windows Print All` for the
complete generated batch. The default **Auto** method discovers the connected
Zebra through Zebra Browser Print, queries its physical resolution, and sends
4in × 3in ZPL using either 203 dpi (812 × 609 dots) or 300 dpi (1200 × 900 dots).
Install and run Browser Print for Windows and approve this website to enable
automatic detection. Windows drivers and browser scaling are bypassed in this mode.

If the printer or its DPI cannot be identified, Auto opens the exact-size PDF
instead and explains why. It never guesses a resolution for Windows. You can
also select **PDF** explicitly in `Windows print method`. If the new tab is
blocked, click `Open Windows labels` in the status message. A failure after
direct label sending begins does not trigger a PDF fallback, to avoid duplicates.

In the PDF print dialog, select the Zebra, set its paper size to **4in × 3in**,
choose **Actual size / 100%**, and use **1 page per sheet**. The PDF also requests
no automatic print scaling, but cannot override a printer driver's saved settings.
The original 4in × 2.5in artwork is centered on the physical label with a small
horizontal safety inset for the border. Mac direct ZPL printing is separate and
is not affected by the Windows PDF layout.

## Deploy to Vercel (free tier)

1. Push to GitHub.
2. Import project in Vercel.
3. Framework preset: Next.js.
4. No environment variables required.
