export type ZebraLabel = {
  company: string;
  projectName: string;
  projectAddress: string;
  referenceText: string;
  number: number;
};

type ZebraDevice = {
  name?: string;
  deviceType?: string;
  connection?: string;
  uid: string;
  version?: number | string;
  provider?: string;
  manufacturer?: string;
};

const BROWSER_PRINT_ORIGINS = [
  "https://127.0.0.1:9101",
  "https://localhost:9101"
];
const REQUEST_TIMEOUT_MS = 12000;
const LABELS_PER_REQUEST = 50;
const DEFAULT_PRINTER_DPI = 300;

type PrinterDpi = 203 | 300;

function cleanZplText(value: string): string {
  return value
    .replace(/[\^~]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNumberFont(number: number): { height: number; width: number } {
  const digits = Math.abs(number).toString().length;

  if (digits <= 4) {
    return { height: 150, width: 125 };
  }

  if (digits <= 6) {
    return { height: 125, width: 105 };
  }

  if (digits <= 8) {
    return { height: 100, width: 84 };
  }

  return { height: 82, width: 68 };
}

function scaleDots(value: number, dpi: PrinterDpi): number {
  return Math.round((value * dpi) / 203);
}

export function buildZplLabel(
  label: ZebraLabel,
  dpi: PrinterDpi = 203
): string {
  const company = cleanZplText(label.company).toUpperCase();
  const projectName = cleanZplText(label.projectName);
  const projectAddress = cleanZplText(label.projectAddress);
  const referenceText = cleanZplText(label.referenceText || "-");
  const numberText = cleanZplText(`#${label.number}`);
  const numberFont = getNumberFont(label.number);
  const dots = (value: number) => scaleDots(value, dpi);

  return [
    "^XA",
    "^CI28",
    "^PON",
    "^FWN",
    `^PW${dpi * 4}`,
    `^LL${dpi * 3}`,
    "^LH0,0",
    "^LS0",
    `^FO${dots(18)},${dots(18)}^GB${dots(776)},${dots(573)},${dots(4)}^FS`,
    `^FO${dots(36)},${dots(34)}^A0N,${dots(68)},${dots(56)}^FB${dots(470)},1,0,L,0^FD${company}^FS`,
    `^FO${dots(530)},${dots(28)}^GB${dots(246)},${dots(92)},${dots(3)}^FS`,
    `^FO${dots(542)},${dots(37)}^A0N,${dots(22)},${dots(18)}^FB${dots(222)},1,0,R,0^FDREFERENCE^FS`,
    `^FO${dots(542)},${dots(72)}^A0N,${dots(30)},${dots(25)}^FB${dots(222)},1,0,R,0^FD${referenceText}^FS`,
    `^FO${dots(36)},${dots(145)}^A0N,${dots(42)},${dots(36)}^FB${dots(740)},2,${dots(5)},L,0^FD${projectName}^FS`,
    `^FO${dots(36)},${dots(245)}^A0N,${dots(33)},${dots(28)}^FB${dots(740)},3,${dots(6)},L,0^FD${projectAddress}^FS`,
    `^FO${dots(20)},${dots(412)}^A0N,${dots(numberFont.height)},${dots(numberFont.width)}^FB${dots(772)},1,0,C,0^FD${numberText}^FS`,
    "^XZ"
  ].join("\n");
}

function parseDevice(payload: unknown): ZebraDevice | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.uid !== "string" || record.uid.length === 0) {
    return null;
  }

  return {
    name: typeof record.name === "string" ? record.name : undefined,
    deviceType: typeof record.deviceType === "string" ? record.deviceType : undefined,
    connection: typeof record.connection === "string" ? record.connection : undefined,
    uid: record.uid,
    version:
      typeof record.version === "string" || typeof record.version === "number"
        ? record.version
        : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    manufacturer: typeof record.manufacturer === "string" ? record.manufacturer : undefined
  };
}

async function browserPrintRequest(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Zebra Browser Print returned HTTP ${response.status}.`);
    }

    return response;
  } finally {
    window.clearTimeout(timer);
  }
}

async function findDefaultPrinter(): Promise<{
  device: ZebraDevice;
  origin: string;
}> {
  let lastError: unknown;

  for (const origin of BROWSER_PRINT_ORIGINS) {
    try {
      const response = await browserPrintRequest(
        `${origin}/default?type=printer`
      );
      const text = await response.text();
      const device = parseDevice(text ? JSON.parse(text) : null);

      if (device) {
        return { device, origin };
      }

      throw new Error(
        "Zebra Browser Print is running, but no default Zebra printer is selected."
      );
    } catch (error) {
      lastError = error;
    }
  }

  if (
    lastError instanceof Error &&
    lastError.message.includes("no default Zebra printer")
  ) {
    throw lastError;
  }

  throw new Error(
    "Cannot reach Zebra Browser Print on this Mac. Install or open Zebra Browser Print, approve this website, and accept its local SSL certificate."
  );
}

function getDevicePayload(device: ZebraDevice): Record<string, string | number> {
  const payload: Record<string, string | number> = { uid: device.uid };

  for (const key of [
    "name",
    "deviceType",
    "connection",
    "version",
    "provider",
    "manufacturer"
  ] as const) {
    const value = device[key];
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  return payload;
}

async function detectPrinterDpi(
  origin: string,
  device: ZebraDevice
): Promise<PrinterDpi> {
  const devicePayload = getDevicePayload(device);

  try {
    await browserPrintRequest(`${origin}/write`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device: devicePayload,
        data: '! U1 getvar "head.resolution.in_dpi"\r\n'
      })
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await browserPrintRequest(`${origin}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ device: devicePayload })
      });
      const text = await response.text();
      const match = text.match(/\b(203|300)\b/);

      if (match?.[1] === "203" || match?.[1] === "300") {
        return Number(match[1]) as PrinterDpi;
      }

      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  } catch {
    // Some Browser Print releases do not expose two-way reads. The physical
    // ZD621 used by this app is the 300 dpi model, so use that safe fallback.
  }

  const deviceDescription = [
    device.name,
    device.manufacturer,
    device.provider
  ].join(" ");

  if (/\b203\s*dpi\b/i.test(deviceDescription)) {
    return 203;
  }

  return DEFAULT_PRINTER_DPI;
}

export async function printZplLabelsDirect(
  labels: ZebraLabel[]
): Promise<{ printerName: string; dpi: PrinterDpi }> {
  const { device, origin } = await findDefaultPrinter();
  const dpi = await detectPrinterDpi(origin, device);
  const jobs = labels.map((label) => buildZplLabel(label, dpi));

  for (let index = 0; index < jobs.length; index += LABELS_PER_REQUEST) {
    const data = jobs.slice(index, index + LABELS_PER_REQUEST).join("\n");

    await browserPrintRequest(`${origin}/write`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device: getDevicePayload(device),
        data
      })
    });
  }

  return {
    printerName: device.name || "default Zebra printer",
    dpi
  };
}
