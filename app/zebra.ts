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

export function buildZplLabel(label: ZebraLabel): string {
  const company = cleanZplText(label.company).toUpperCase();
  const projectName = cleanZplText(label.projectName);
  const projectAddress = cleanZplText(label.projectAddress);
  const referenceText = cleanZplText(label.referenceText || "-");
  const numberText = cleanZplText(`#${label.number}`);
  const numberFont = getNumberFont(label.number);

  return [
    "^XA",
    "^CI28",
    "^PON",
    "^FWN",
    "^PW812",
    "^LL609",
    "^LH0,0",
    "^LS0",
    "^FO18,18^GB776,573,4^FS",
    `^FO36,34^A0N,68,56^FB470,1,0,L,0^FD${company}^FS`,
    "^FO530,28^GB246,92,3^FS",
    "^FO542,37^A0N,22,18^FB222,1,0,R,0^FDREFERENCE^FS",
    `^FO542,72^A0N,30,25^FB222,1,0,R,0^FD${referenceText}^FS`,
    `^FO36,145^A0N,42,36^FB740,2,5,L,0^FD${projectName}^FS`,
    `^FO36,245^A0N,33,28^FB740,3,6,L,0^FD${projectAddress}^FS`,
    `^FO20,412^A0N,${numberFont.height},${numberFont.width}^FB772,1,0,C,0^FD${numberText}^FS`,
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

export async function printZplLabelsDirect(
  labels: ZebraLabel[]
): Promise<string> {
  const { device, origin } = await findDefaultPrinter();
  const jobs = labels.map(buildZplLabel);

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

  return device.name || "default Zebra printer";
}
