"use client";

import { useEffect, useMemo, useState } from "react";

type Company = "Scanio" | "Montia";

type PrintableLabel = {
  company: Company;
  projectName: string;
  projectAddress: string;
  number: number;
};

const MAX_LABELS_PER_BATCH = 2000;

function parseWholeNumber(value: string): number | null {
  const trimmed = value.trim();

  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }

  const numberValue = Number(trimmed);
  if (!Number.isSafeInteger(numberValue)) {
    return null;
  }

  return numberValue;
}

export default function HomePage() {
  const [company, setCompany] = useState<Company>("Scanio");
  const [projectName, setProjectName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [startNumber, setStartNumber] = useState("");
  const [labelCount, setLabelCount] = useState("");
  const [generatedNumbers, setGeneratedNumbers] = useState<number[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [status, setStatus] = useState("");
  const [printLabels, setPrintLabels] = useState<PrintableLabel[]>([]);
  const [pendingPrint, setPendingPrint] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedNumbers), [selectedNumbers]);

  useEffect(() => {
    if (!pendingPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [pendingPrint, printLabels]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPendingPrint(false);
      setPrintLabels([]);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  function hasTemplateValues(): boolean {
    return projectName.trim().length > 0 && projectAddress.trim().length > 0;
  }

  function generateBatch() {
    if (!hasTemplateValues()) {
      setStatus("Fill Project Name and Project Address before generating labels.");
      return;
    }

    const start = parseWholeNumber(startNumber);
    const count = parseWholeNumber(labelCount);

    if (start === null || count === null) {
      setStatus("Start Number and Label Count must be whole numbers.");
      return;
    }

    if (count <= 0) {
      setStatus("Label Count must be greater than 0.");
      return;
    }

    if (count > MAX_LABELS_PER_BATCH) {
      setStatus(`Label Count is too large. Maximum batch size is ${MAX_LABELS_PER_BATCH} labels.`);
      return;
    }

    const numbers = Array.from({ length: count }, (_, index) => start + index);
    setGeneratedNumbers(numbers);
    setSelectedNumbers(numbers);
    setStatus(`Generated ${count} label${count === 1 ? "" : "s"}. All selected by default.`);
  }

  function toggleNumberSelection(value: number) {
    setSelectedNumbers((prev) => {
      if (prev.includes(value)) {
        return prev.filter((numberValue) => numberValue !== value);
      }

      return [...prev, value].sort((a, b) => a - b);
    });
  }

  function buildPrintableLabels(numbers: number[]): PrintableLabel[] {
    const trimmedProjectName = projectName.trim();
    const trimmedProjectAddress = projectAddress.trim();

    return numbers
      .slice()
      .sort((a, b) => a - b)
      .map((numberValue) => ({
        company,
        projectName: trimmedProjectName,
        projectAddress: trimmedProjectAddress,
        number: numberValue
      }));
  }

  function startPrint(labels: PrintableLabel[]) {
    setPrintLabels(labels.map((label) => ({ ...label })));
    setPendingPrint(true);
  }

  function printSelected() {
    if (!hasTemplateValues()) {
      setStatus("Fill Project Name and Project Address before printing.");
      return;
    }

    if (selectedNumbers.length === 0) {
      setStatus("Select at least one number to print.");
      return;
    }

    setStatus("");
    startPrint(buildPrintableLabels(selectedNumbers));
  }

  function printAllGenerated() {
    if (!hasTemplateValues()) {
      setStatus("Fill Project Name and Project Address before printing.");
      return;
    }

    if (generatedNumbers.length === 0) {
      setStatus("Generate labels first before printing all labels.");
      return;
    }

    setStatus("");
    startPrint(buildPrintableLabels(generatedNumbers));
  }

  function selectAll() {
    setSelectedNumbers(generatedNumbers);
  }

  function clearSelection() {
    setSelectedNumbers([]);
  }

  const sampleNumber =
    selectedNumbers.length > 0
      ? selectedNumbers[0]
      : generatedNumbers.length > 0
        ? generatedNumbers[0]
        : parseWholeNumber(startNumber) ?? 12352;

  return (
    <>
      <main id="app-root" className="min-h-screen bg-paper px-4 py-6 text-ink md:px-8 md:py-10">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Warehouse Label Batch Printer</h1>
            <p className="mt-2 text-lg text-steel">
              4in × 3in Zebra labels with company, project details, and a large bold number.
            </p>
          </header>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="grid gap-4">
                <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-600">Company</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {(["Scanio", "Montia"] as Company[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setCompany(option)}
                        className={`h-12 rounded-xl border-2 text-base font-extrabold transition ${
                          company === option
                            ? "border-ink bg-ink text-white"
                            : "border-slate-300 bg-white text-ink hover:border-ink"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">Project Name</span>
                  <input
                    className="h-12 rounded-lg border border-slate-300 px-3 text-lg font-semibold text-ink outline-none transition focus:border-slate-600"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    autoComplete="off"
                  />
                </label>

                <label className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">Project Address</span>
                  <textarea
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-3 text-lg font-semibold text-ink outline-none transition focus:border-slate-600"
                    value={projectAddress}
                    onChange={(event) => setProjectAddress(event.target.value)}
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">Start Number</span>
                    <input
                      className="h-12 rounded-lg border border-slate-300 px-3 text-lg font-semibold text-ink outline-none transition focus:border-slate-600"
                      value={startNumber}
                      onChange={(event) => setStartNumber(event.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <label className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
                    <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">Label Count</span>
                    <input
                      className="h-12 rounded-lg border border-slate-300 px-3 text-lg font-semibold text-ink outline-none transition focus:border-slate-600"
                      value={labelCount}
                      onChange={(event) => setLabelCount(event.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={generateBatch}
                    className="h-12 rounded-xl bg-ink px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Generate Labels
                  </button>
                  <button
                    type="button"
                    onClick={printSelected}
                    className="h-12 rounded-xl bg-ink px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={selectedNumbers.length === 0}
                  >
                    Print Selected
                  </button>
                  <button
                    type="button"
                    onClick={printAllGenerated}
                    className="h-12 rounded-xl border-2 border-ink bg-white px-6 text-base font-bold text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                    disabled={generatedNumbers.length === 0}
                  >
                    Print All Generated
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                <section className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <h2 className="text-lg font-extrabold text-ink">Live Label Preview</h2>
                  <div className="mt-3 rounded-lg border-2 border-slate-900 bg-white p-4">
                    <p className="text-3xl font-black uppercase tracking-tight">{company}</p>
                    <p className="mt-2 text-xl font-black">{projectName.trim() || "Project Name"}</p>
                    <p className="mt-1 whitespace-pre-wrap text-lg font-bold leading-tight text-slate-800">
                      {projectAddress.trim() || "Project Address"}
                    </p>
                    <div className="mt-4 text-center">
                      <p className="text-6xl font-black leading-none tracking-wide">#{sampleNumber}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-300 bg-white p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-ink">Number Selection</h2>
                      <p className="text-sm font-semibold text-steel">
                        {generatedNumbers.length} generated, {selectedNumbers.length} selected.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:text-slate-400"
                        disabled={generatedNumbers.length === 0}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:text-slate-400"
                        disabled={selectedNumbers.length === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {generatedNumbers.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-steel">
                      Generate labels to select individual numbers for printing.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50 p-3">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {generatedNumbers.map((numberValue) => {
                          const checked = selectedSet.has(numberValue);

                          return (
                            <label
                              key={numberValue}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-sm font-bold transition ${
                                checked
                                  ? "border-ink bg-white text-ink"
                                  : "border-slate-300 bg-slate-100 text-slate-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleNumberSelection(numberValue)}
                                className="h-4 w-4 rounded border-slate-400"
                              />
                              <span>#{numberValue}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </section>

          {status && (
            <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-ink shadow-sm">
              {status}
            </div>
          )}
        </section>
      </main>

      <section id="print-root" aria-hidden>
        {printLabels.map((label, index) => (
          <div key={`${label.number}-${index}`} className="print-page">
            <article className="print-label">
              <p className="print-company">{label.company}</p>
              <p className="print-project">{label.projectName}</p>
              <p className="print-address">{label.projectAddress}</p>
              <div className="print-number-wrap">
                <p className="print-number">#{label.number}</p>
              </div>
            </article>
          </div>
        ))}
      </section>
    </>
  );
}
