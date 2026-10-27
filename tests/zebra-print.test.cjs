const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../app/zebra.ts");
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(path.dirname(filename));
compiled._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, filename);
const { prepareZebraPrinter, printPreparedZplLabels, printZplLabelsDirect } = compiled.exports;

const originalFetch = global.fetch;
const originalWindow = global.window;
global.window = globalThis;
afterEach(() => { global.fetch = originalFetch; });
process.on("exit", () => { global.window = originalWindow; });

const label = { company: "Scanio", projectName: "Test", projectAddress: "123 Main St", referenceText: "REF", number: 1 };

function mockPrinter({ name = "Zebra ZD621", replies = ['"300"'], readFails = false, sendFails = false } = {}) {
  const jobs = [];
  let readIndex = 0;
  global.fetch = async (url, options) => {
    const endpoint = new URL(url).pathname;
    if (endpoint === "/available") {
      return Response.json({ printer: [{ name, uid: "usb-connected", deviceType: "printer", manufacturer: "Zebra" }] });
    }
    if (endpoint === "/read") {
      if (readFails) throw new Error("Reading unavailable");
      return new Response(replies[readIndex++] || "");
    }
    if (endpoint === "/write") {
      const { data, device } = JSON.parse(options.body);
      assert.equal(device.uid, "usb-connected");
      if (data.startsWith("^XA")) {
        jobs.push(data);
        if (sendFails) return new Response("Printer write failed", { status: 500 });
      }
      return new Response("");
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  return jobs;
}

for (const dpi of [203, 300]) {
  test(`Windows Auto sends exact 4x3 dimensions for ${dpi} dpi`, async () => {
    const jobs = mockPrinter({ replies: [`"${dpi}"`] });
    const printer = await prepareZebraPrinter({ requireDetectedDpi: true });
    assert.equal(printer.dpi, dpi);
    assert.equal(jobs.length, 0, "discovery must not print a label");
    await printPreparedZplLabels([label], printer);
    assert.equal(jobs.length, 1);
    assert(jobs[0].includes(`^PW${dpi * 4}\n^LL${dpi * 3}`));
  });
}

test("hardware query takes priority over a resolution in the printer name", async () => {
  mockPrinter({ name: "Zebra ZD621-203dpi", replies: ['"300"'] });
  assert.equal((await prepareZebraPrinter({ requireDetectedDpi: true })).dpi, 300);
});

test("fragmented hardware replies are assembled before selecting a DPI", async () => {
  mockPrinter({ replies: ['"30', '0"'] });
  assert.equal((await prepareZebraPrinter({ requireDetectedDpi: true })).dpi, 300);
});

test("Windows Auto rejects an unknown DPI without sending labels", async () => {
  const jobs = mockPrinter({ replies: ['"unknown"'] });
  await assert.rejects(prepareZebraPrinter({ requireDetectedDpi: true }), /Could not detect/);
  assert.equal(jobs.length, 0);
});

test("a hardware device name can identify DPI when reads are unavailable", async () => {
  mockPrinter({ name: "Zebra ZD621-300dpi ZPL", readFails: true });
  assert.equal((await prepareZebraPrinter({ requireDetectedDpi: true })).dpi, 300);
});

test("missing Browser Print is reported before any labels are sent", async () => {
  global.fetch = async () => { throw new TypeError("Connection refused"); };
  await assert.rejects(prepareZebraPrinter({ requireDetectedDpi: true }), /Cannot reach Zebra Browser Print/);
});

test("Mac retains the existing 300 dpi fallback and label layout", async () => {
  const jobs = mockPrinter({ replies: ['"unknown"'] });
  const result = await printZplLabelsDirect([label]);
  assert.equal(result.dpi, 300);
  assert(jobs[0].includes("^PW1200\n^LL900"));
  assert(jobs[0].includes("^FO27,75^GB1147,749,9^FS"));
});

test("a failed label write is not retried automatically", async () => {
  const jobs = mockPrinter({ sendFails: true });
  const printer = await prepareZebraPrinter({ requireDetectedDpi: true });
  await assert.rejects(printPreparedZplLabels([label], printer), /HTTP 500/);
  assert.equal(jobs.length, 1);
});
