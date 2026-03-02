"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type LabelForm = {
  field1: string;
  field2: string;
  field3: string;
  field4: string;
};

type QueueLabel = LabelForm & {
  id: string;
};

type Mode = "single" | "batch";

const EMPTY_FORM: LabelForm = {
  field1: "",
  field2: "",
  field3: "",
  field4: ""
};

function isValidLabel(label: LabelForm): boolean {
  return Object.values(label).every((value) => value.trim().length > 0);
}

function buildQueueLabel(label: LabelForm): QueueLabel {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    field1: label.field1.trim(),
    field2: label.field2.trim(),
    field3: label.field3.trim(),
    field4: label.field4.trim()
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function parseCsv(text: string): LabelForm[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const parsed = lines.map(parseCsvLine);

  let startIndex = 0;
  const firstLine = parsed[0].map((cell) => cell.toLowerCase());
  const looksLikeHeader =
    firstLine.length >= 4 &&
    firstLine.slice(0, 4).every((cell) => cell.includes("field"));

  if (looksLikeHeader) {
    startIndex = 1;
  }

  const labels: LabelForm[] = [];

  for (let i = startIndex; i < parsed.length; i += 1) {
    const row = parsed[i];

    if (row.length < 4) {
      throw new Error(`Row ${i + 1} has fewer than 4 columns.`);
    }

    const label: LabelForm = {
      field1: row[0].trim(),
      field2: row[1].trim(),
      field3: row[2].trim(),
      field4: row[3].trim()
    };

    if (!isValidLabel(label)) {
      throw new Error(`Row ${i + 1} has empty values.`);
    }

    labels.push(label);
  }

  return labels;
}

function FieldInputs({
  value,
  onChange,
  idPrefix = "field"
}: {
  value: LabelForm;
  onChange: (next: LabelForm) => void;
  idPrefix?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((fieldNumber) => {
        const key = `field${fieldNumber}` as keyof LabelForm;

        return (
          <label
            key={key}
            className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
            htmlFor={`${idPrefix}-${key}`}
          >
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Field {fieldNumber}
            </span>
            <input
              id={`${idPrefix}-${key}`}
              className="h-12 rounded-lg border border-slate-300 px-3 text-lg font-semibold text-ink outline-none transition focus:border-slate-600"
              value={value[key]}
              onChange={(event) =>
                onChange({
                  ...value,
                  [key]: event.target.value
                })
              }
              autoComplete="off"
            />
          </label>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("single");
  const [singleLabel, setSingleLabel] = useState<LabelForm>(EMPTY_FORM);
  const [batchForm, setBatchForm] = useState<LabelForm>(EMPTY_FORM);
  const [queue, setQueue] = useState<QueueLabel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<LabelForm>(EMPTY_FORM);
  const [status, setStatus] = useState<string>("");
  const [csvStatus, setCsvStatus] = useState<string>("");
  const [printLabels, setPrintLabels] = useState<LabelForm[]>([]);
  const [pendingPrint, setPendingPrint] = useState(false);

  const queueCount = useMemo(() => queue.length, [queue.length]);

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

  function startPrint(labels: LabelForm[]) {
    setPrintLabels(labels.map((label) => ({ ...label })));
    setPendingPrint(true);
  }

  function handleSinglePrint() {
    if (!isValidLabel(singleLabel)) {
      setStatus("Fill all four fields before printing a label.");
      return;
    }

    setStatus("");
    startPrint([singleLabel]);
  }

  function addToQueue() {
    if (!isValidLabel(batchForm)) {
      setStatus("Fill all four fields before adding to the queue.");
      return;
    }

    setQueue((prev) => [...prev, buildQueueLabel(batchForm)]);
    setBatchForm(EMPTY_FORM);
    setStatus("Label added to queue.");
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);

      if (parsed.length === 0) {
        setCsvStatus("CSV did not contain any label rows.");
        return;
      }

      setQueue((prev) => [...prev, ...parsed.map((label) => buildQueueLabel(label))]);
      setCsvStatus(`Imported ${parsed.length} label${parsed.length === 1 ? "" : "s"}.`);
      setStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSV import failed.";
      setCsvStatus(message);
    }
  }

  function deleteFromQueue(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingForm(EMPTY_FORM);
    }
  }

  function startEdit(item: QueueLabel) {
    setEditingId(item.id);
    setEditingForm({
      field1: item.field1,
      field2: item.field2,
      field3: item.field3,
      field4: item.field4
    });
  }

  function saveEdit(id: string) {
    if (!isValidLabel(editingForm)) {
      setStatus("All edit fields must be filled before saving.");
      return;
    }

    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              field1: editingForm.field1.trim(),
              field2: editingForm.field2.trim(),
              field3: editingForm.field3.trim(),
              field4: editingForm.field4.trim()
            }
          : item
      )
    );

    setEditingId(null);
    setEditingForm(EMPTY_FORM);
    setStatus("Queue item updated.");
  }

  function printQueue() {
    if (queue.length === 0) {
      setStatus("Add labels to the queue before batch printing.");
      return;
    }

    setStatus("");
    startPrint(queue.map(({ field1, field2, field3, field4 }) => ({ field1, field2, field3, field4 })));
  }

  return (
    <>
      <main id="app-root" className="min-h-screen bg-paper px-4 py-6 text-ink md:px-8 md:py-10">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Warehouse Label Printer
            </h1>
            <p className="mt-2 text-lg text-steel">
              Print exactly 4in × 3in labels for Zebra ZD621 using the browser print dialog.
            </p>
          </header>

          <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-2">
            <button
              type="button"
              className={`h-14 rounded-xl border-2 text-lg font-bold transition ${
                mode === "single"
                  ? "border-ink bg-ink text-white"
                  : "border-slate-300 bg-white text-ink hover:border-ink"
              }`}
              onClick={() => {
                setMode("single");
                setStatus("");
              }}
            >
              Single Print
            </button>
            <button
              type="button"
              className={`h-14 rounded-xl border-2 text-lg font-bold transition ${
                mode === "batch"
                  ? "border-ink bg-ink text-white"
                  : "border-slate-300 bg-white text-ink hover:border-ink"
              }`}
              onClick={() => {
                setMode("batch");
                setStatus("");
              }}
            >
              Batch Print
            </button>
          </section>

          {mode === "single" && (
            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
              <div className="mb-4">
                <h2 className="text-2xl font-extrabold">Single Label</h2>
                <p className="text-steel">Fill in four fields and print one 4x3 label.</p>
              </div>

              <FieldInputs value={singleLabel} onChange={setSingleLabel} idPrefix="single" />

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSinglePrint}
                  className="h-14 rounded-xl bg-ink px-8 text-lg font-extrabold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Print Label
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSingleLabel(EMPTY_FORM);
                    setStatus("");
                  }}
                  className="h-14 rounded-xl border-2 border-slate-300 bg-white px-8 text-lg font-semibold text-ink transition hover:border-ink"
                >
                  Clear
                </button>
              </div>
            </section>
          )}

          {mode === "batch" && (
            <section className="grid gap-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
                <div className="mb-4">
                  <h2 className="text-2xl font-extrabold">Add Label To Queue</h2>
                  <p className="text-steel">Enter a label manually or import rows from CSV.</p>
                </div>

                <FieldInputs value={batchForm} onChange={setBatchForm} idPrefix="batch" />

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={addToQueue}
                    className="h-14 rounded-xl bg-ink px-8 text-lg font-extrabold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Add To Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchForm(EMPTY_FORM)}
                    className="h-14 rounded-xl border-2 border-slate-300 bg-white px-8 text-lg font-semibold text-ink transition hover:border-ink"
                  >
                    Clear Entry
                  </button>
                </div>

                <div className="mt-6 rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <h3 className="text-lg font-bold">CSV Import (4 columns)</h3>
                  <p className="text-sm text-steel">
                    Upload a CSV where each row maps to Field 1, Field 2, Field 3, Field 4.
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={importCsv}
                    className="mt-3 block w-full text-sm font-medium text-steel file:mr-4 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-slate-800"
                  />
                  {csvStatus && <p className="mt-2 text-sm font-semibold text-steel">{csvStatus}</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold">Queue</h2>
                    <p className="text-steel">{queueCount} label{queueCount === 1 ? "" : "s"} ready.</p>
                  </div>
                  <button
                    type="button"
                    onClick={printQueue}
                    className="h-14 rounded-xl bg-ink px-8 text-lg font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={queue.length === 0}
                  >
                    Print All
                  </button>
                </div>

                {queue.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-steel">
                    Queue is empty.
                  </div>
                )}

                <div className="grid gap-4">
                  {queue.map((item, index) => {
                    const isEditing = editingId === item.id;

                    return (
                      <article
                        key={item.id}
                        className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-lg font-extrabold">Label {index + 1}</h3>
                          <div className="flex gap-2">
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-ink transition hover:border-ink"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteFromQueue(item.id)}
                              className="h-10 rounded-lg border border-red-300 px-4 text-sm font-bold text-red-700 transition hover:border-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <>
                            <FieldInputs value={editingForm} onChange={setEditingForm} idPrefix={`edit-${item.id}`} />
                            <div className="mt-4 flex gap-3">
                              <button
                                type="button"
                                onClick={() => saveEdit(item.id)}
                                className="h-11 rounded-lg bg-ink px-5 text-sm font-bold text-white transition hover:bg-slate-800"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingForm(EMPTY_FORM);
                                }}
                                className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-bold text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="grid gap-2 text-base font-semibold text-ink md:grid-cols-2">
                            <p className="rounded-md bg-slate-50 px-3 py-2">Field 1: {item.field1}</p>
                            <p className="rounded-md bg-slate-50 px-3 py-2">Field 2: {item.field2}</p>
                            <p className="rounded-md bg-slate-50 px-3 py-2">Field 3: {item.field3}</p>
                            <p className="rounded-md bg-slate-50 px-3 py-2">Field 4: {item.field4}</p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {status && (
            <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-ink shadow-sm">
              {status}
            </div>
          )}
        </section>
      </main>

      <section id="print-root" aria-hidden>
        {printLabels.map((label, index) => (
          <div key={`${label.field1}-${label.field2}-${index}`} className="print-page">
            <article className="print-label">
              <div className="print-field print-field-1">{label.field1}</div>
              <div className="print-row">
                <div className="print-field print-field-2">{label.field2}</div>
                <div className="print-field print-field-3">{label.field3}</div>
              </div>
              <div className="print-field print-field-4">{label.field4}</div>
            </article>
          </div>
        ))}
      </section>
    </>
  );
}
