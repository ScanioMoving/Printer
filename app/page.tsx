"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type LabelForm = {
  designer: string;
  projectNumber: string;
  item: string;
  inventoryNumber: string;
};

type QueueLabel = LabelForm & {
  id: string;
};

type Mode = "single" | "batch";

type FieldConfig = {
  key: keyof LabelForm;
  inputLabel: string;
  printLabel: string;
};

const FIELD_CONFIG: FieldConfig[] = [
  { key: "designer", inputLabel: "Designer", printLabel: "DESIGNER" },
  { key: "projectNumber", inputLabel: "Project #", printLabel: "PROJECT #" },
  { key: "item", inputLabel: "Item", printLabel: "ITEM" },
  { key: "inventoryNumber", inputLabel: "Inventory #", printLabel: "INVENTORY #" }
];

const EMPTY_FORM: LabelForm = {
  designer: "",
  projectNumber: "",
  item: "",
  inventoryNumber: ""
};

function isValidLabel(label: LabelForm): boolean {
  return Object.values(label).every((value) => value.trim().length > 0);
}

function buildQueueLabel(label: LabelForm): QueueLabel {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    designer: label.designer.trim(),
    projectNumber: label.projectNumber.trim(),
    item: label.item.trim(),
    inventoryNumber: label.inventoryNumber.trim()
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

function normalizeCsvHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function looksLikeHeaderRow(row: string[]): boolean {
  if (row.length < 4) {
    return false;
  }

  const normalized = row.slice(0, 4).map(normalizeCsvHeader);
  const aliasSets = [
    ["designer", "field1"],
    ["project", "projectnumber", "projectnum", "field2"],
    ["item", "field3"],
    ["inventory", "inventorynumber", "inventorynum", "field4"]
  ];

  return aliasSets.every((aliases, index) => aliases.some((alias) => normalized[index].includes(alias)));
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
  const startIndex = looksLikeHeaderRow(parsed[0]) ? 1 : 0;
  const labels: LabelForm[] = [];

  for (let i = startIndex; i < parsed.length; i += 1) {
    const row = parsed[i];

    if (row.length < 4) {
      throw new Error(`Row ${i + 1} has fewer than 4 columns.`);
    }

    const label: LabelForm = {
      designer: row[0].trim(),
      projectNumber: row[1].trim(),
      item: row[2].trim(),
      inventoryNumber: row[3].trim()
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
      {FIELD_CONFIG.map(({ key, inputLabel }) => (
        <label
          key={key}
          className="flex flex-col gap-2 rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
          htmlFor={`${idPrefix}-${key}`}
        >
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-600">{inputLabel}</span>
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
      ))}
    </div>
  );
}

function LabelPreview({ label }: { label: LabelForm }) {
  return (
    <div className="grid overflow-hidden rounded-lg border-2 border-slate-900 md:grid-cols-2">
      <div className="border-b-2 border-r-0 border-slate-900 p-3 md:border-b-2 md:border-r-2">
        <p className="text-xs font-extrabold tracking-wider text-slate-600">DESIGNER</p>
        <p className="text-xl font-black text-ink">{label.designer}</p>
      </div>
      <div className="border-b-2 border-slate-900 p-3">
        <p className="text-xs font-extrabold tracking-wider text-slate-600">PROJECT #</p>
        <p className="text-xl font-black text-ink">{label.projectNumber}</p>
      </div>
      <div className="border-r-0 border-slate-900 p-3 md:border-r-2">
        <p className="text-xs font-extrabold tracking-wider text-slate-600">ITEM</p>
        <p className="text-xl font-black text-ink">{label.item}</p>
      </div>
      <div className="p-3">
        <p className="text-xs font-extrabold tracking-wider text-slate-600">INVENTORY #</p>
        <p className="text-xl font-black text-ink">{label.inventoryNumber}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("single");
  const [singleLabel, setSingleLabel] = useState<LabelForm>(EMPTY_FORM);
  const [batchForm, setBatchForm] = useState<LabelForm>(EMPTY_FORM);
  const [queue, setQueue] = useState<QueueLabel[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<LabelForm>(EMPTY_FORM);
  const [status, setStatus] = useState<string>("");
  const [csvStatus, setCsvStatus] = useState<string>("");
  const [printLabels, setPrintLabels] = useState<LabelForm[]>([]);
  const [pendingPrint, setPendingPrint] = useState(false);

  const queueCount = queue.length;

  useEffect(() => {
    setSelectedIds((prev) => {
      const queueIds = new Set(queue.map((item) => item.id));
      const filtered = prev.filter((id) => queueIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [queue]);

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

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedCount = useMemo(
    () => queue.reduce((count, item) => (selectedSet.has(item.id) ? count + 1 : count), 0),
    [queue, selectedSet]
  );

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

    const next = buildQueueLabel(batchForm);
    setQueue((prev) => [...prev, next]);
    setSelectedIds((prev) => [...prev, next.id]);
    setBatchForm(EMPTY_FORM);
    setStatus("Label added to queue and selected for printing.");
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

      const imported = parsed.map((label) => buildQueueLabel(label));
      setQueue((prev) => [...prev, ...imported]);
      setSelectedIds((prev) => [...prev, ...imported.map((item) => item.id)]);
      setCsvStatus(`Imported ${parsed.length} label${parsed.length === 1 ? "" : "s"}.`);
      setStatus("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "CSV import failed.";
      setCsvStatus(message);
    }
  }

  function deleteFromQueue(id: string) {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));

    if (editingId === id) {
      setEditingId(null);
      setEditingForm(EMPTY_FORM);
    }
  }

  function startEdit(item: QueueLabel) {
    setEditingId(item.id);
    setEditingForm({
      designer: item.designer,
      projectNumber: item.projectNumber,
      item: item.item,
      inventoryNumber: item.inventoryNumber
    });
  }

  function saveEdit(id: string) {
    if (!isValidLabel(editingForm)) {
      setStatus("All edit fields must be filled before saving.");
      return;
    }

    setQueue((prev) =>
      prev.map((queueItem) =>
        queueItem.id === id
          ? {
              ...queueItem,
              designer: editingForm.designer.trim(),
              projectNumber: editingForm.projectNumber.trim(),
              item: editingForm.item.trim(),
              inventoryNumber: editingForm.inventoryNumber.trim()
            }
          : queueItem
      )
    );

    setEditingId(null);
    setEditingForm(EMPTY_FORM);
    setStatus("Queue item updated.");
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id]));
  }

  function selectAll() {
    setSelectedIds(queue.map((item) => item.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function printSelectedQueue() {
    const labelsToPrint = queue.filter((item) => selectedSet.has(item.id));

    if (labelsToPrint.length === 0) {
      setStatus("Select at least one label before printing.");
      return;
    }

    setStatus("");
    startPrint(
      labelsToPrint.map(({ designer, projectNumber, item, inventoryNumber }) => ({
        designer,
        projectNumber,
        item,
        inventoryNumber
      }))
    );
  }

  function printAllQueue() {
    if (queue.length === 0) {
      setStatus("Add labels to the queue before batch printing.");
      return;
    }

    setStatus("");
    startPrint(
      queue.map(({ designer, projectNumber, item, inventoryNumber }) => ({
        designer,
        projectNumber,
        item,
        inventoryNumber
      }))
    );
  }

  return (
    <>
      <main id="app-root" className="min-h-screen bg-paper px-4 py-6 text-ink md:px-8 md:py-10">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Warehouse Label Printer</h1>
            <p className="mt-2 text-lg text-steel">
              Prints in exact 4in × 3in format with a Zebra-friendly black and white layout.
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
                <p className="text-steel">Fill Designer, Project #, Item, and Inventory #, then print one label.</p>
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
                  <p className="text-steel">Add manually or import CSV. New rows are auto-selected for print.</p>
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
                    CSV order: Designer, Project #, Item, Inventory #. Optional header row supported.
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
                <div className="mb-4 flex flex-col gap-3">
                  <div>
                    <h2 className="text-2xl font-extrabold">Queue</h2>
                    <p className="text-steel">
                      {queueCount} label{queueCount === 1 ? "" : "s"} queued, {selectedCount} selected.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={printSelectedQueue}
                      className="h-12 rounded-xl bg-ink px-6 text-base font-extrabold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={selectedCount === 0}
                    >
                      Print Selected
                    </button>
                    <button
                      type="button"
                      onClick={printAllQueue}
                      className="h-12 rounded-xl border-2 border-ink bg-white px-6 text-base font-bold text-ink transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                      disabled={queue.length === 0}
                    >
                      Print All
                    </button>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="h-12 rounded-xl border-2 border-slate-300 bg-white px-6 text-base font-bold text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={queue.length === 0}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="h-12 rounded-xl border-2 border-slate-300 bg-white px-6 text-base font-bold text-ink transition hover:border-ink disabled:cursor-not-allowed disabled:text-slate-400"
                      disabled={selectedCount === 0}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {queue.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-steel">
                    Queue is empty.
                  </div>
                )}

                <div className="grid gap-4">
                  {queue.map((queueItem, index) => {
                    const isEditing = editingId === queueItem.id;
                    const isSelected = selectedSet.has(queueItem.id);

                    return (
                      <article
                        key={queueItem.id}
                        className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <label className="inline-flex items-center gap-2 text-sm font-bold text-ink">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(queueItem.id)}
                              className="h-5 w-5 rounded border-slate-400"
                            />
                            <span>Label {index + 1} selected for print</span>
                          </label>

                          <div className="flex gap-2">
                            {!isEditing && (
                              <button
                                type="button"
                                onClick={() => startEdit(queueItem)}
                                className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-ink transition hover:border-ink"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteFromQueue(queueItem.id)}
                              className="h-10 rounded-lg border border-red-300 px-4 text-sm font-bold text-red-700 transition hover:border-red-500"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isEditing ? (
                          <>
                            <FieldInputs
                              value={editingForm}
                              onChange={setEditingForm}
                              idPrefix={`edit-${queueItem.id}`}
                            />
                            <div className="mt-4 flex gap-3">
                              <button
                                type="button"
                                onClick={() => saveEdit(queueItem.id)}
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
                          <LabelPreview label={queueItem} />
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
          <div key={`${label.designer}-${label.projectNumber}-${index}`} className="print-page">
            <article className="print-label">
              <section className="print-cell print-cell-left print-cell-top">
                <p className="print-cell-title">{FIELD_CONFIG[0].printLabel}</p>
                <p className="print-cell-value">{label.designer}</p>
              </section>
              <section className="print-cell print-cell-top">
                <p className="print-cell-title">{FIELD_CONFIG[1].printLabel}</p>
                <p className="print-cell-value">{label.projectNumber}</p>
              </section>
              <section className="print-cell print-cell-left">
                <p className="print-cell-title">{FIELD_CONFIG[2].printLabel}</p>
                <p className="print-cell-value">{label.item}</p>
              </section>
              <section className="print-cell">
                <p className="print-cell-title">{FIELD_CONFIG[3].printLabel}</p>
                <p className="print-cell-value">{label.inventoryNumber}</p>
              </section>
            </article>
          </div>
        ))}
      </section>
    </>
  );
}
