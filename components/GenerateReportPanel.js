"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PATROLLERS_DEPLOYED_HEADERS,
  PATROLLERS_DEPLOYED_REPORT_ID,
  REPORT_TYPES,
  buildPatrollersDeployedRows,
  downloadCsv,
  printPatrollersDeployedReport,
  rowsToCsv,
  sortOffices,
} from "@/lib/reports/patrollersDeployed";

export default function GenerateReportPanel({ locations = [], onClose }) {
  const dialogRef = useRef(null);
  const [reportType, setReportType] = useState(PATROLLERS_DEPLOYED_REPORT_ID);
  const [officeFilter, setOfficeFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [rows, setRows] = useState(null);
  const [generatedMeta, setGeneratedMeta] = useState(null);
  const [error, setError] = useState("");

  const offices = useMemo(() => {
    const set = new Set();
    for (const loc of locations) {
      const office = String(loc?.office ?? "").trim();
      if (office) set.add(office);
    }
    return sortOffices([...set]);
  }, [locations]);

  const units = useMemo(() => {
    const set = new Set();
    for (const loc of locations) {
      const office = String(loc?.office ?? "").trim();
      if (officeFilter !== "all" && office !== officeFilter) continue;
      const unit = String(loc?.unit ?? "").trim();
      if (unit) set.add(unit);
    }
    return [...set].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [locations, officeFilter]);

  useEffect(() => {
    if (unitFilter === "all") return;
    if (!units.includes(unitFilter)) setUnitFilter("all");
  }, [unitFilter, units]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector("select, button")?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function handleGenerate(event) {
    event.preventDefault();
    setError("");

    if (reportType !== PATROLLERS_DEPLOYED_REPORT_ID) {
      setError("Selected report type is not available yet.");
      return;
    }

    const filtered = locations.filter((loc) => {
      const office = String(loc?.office ?? "").trim();
      const unit = String(loc?.unit ?? "").trim();
      if (officeFilter !== "all" && office !== officeFilter) return false;
      if (unitFilter !== "all" && unit !== unitFilter) return false;
      return true;
    });

    const nextRows = buildPatrollersDeployedRows(filtered);
    setRows(nextRows);
    setGeneratedMeta({
      generatedAt: new Date(),
      officeFilter: officeFilter === "all" ? "All offices" : officeFilter,
      unitFilter: unitFilter === "all" ? "All units" : unitFilter,
    });
  }

  function handleDownloadCsv() {
    if (!rows) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadCsv(`patrollers-deployed-${stamp}.csv`, rowsToCsv(rows));
  }

  function handlePrint() {
    if (!rows || !generatedMeta) return;
    try {
      printPatrollersDeployedReport(rows, generatedMeta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open print view.");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2200] flex touch-none items-center justify-center bg-black/55 p-3 sm:p-4"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="pointer-events-auto flex max-h-[92vh] w-full max-w-6xl touch-auto flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-report-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <h2
              id="generate-report-title"
              className="text-base font-semibold text-foreground"
            >
              Generate Report
            </h2>
            <p className="mt-1 text-xs text-muted">
              Build a report from currently active patrol units.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-background/80 hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <form
            className="grid gap-3 rounded-xl border border-border/60 bg-background/30 p-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={handleGenerate}
          >
            <label className="block text-xs font-medium text-muted sm:col-span-2 lg:col-span-1">
              Report type
              <select
                value={reportType}
                onChange={(event) => {
                  setReportType(event.target.value);
                  setRows(null);
                  setGeneratedMeta(null);
                }}
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Office
              <select
                value={officeFilter}
                onChange={(event) => {
                  setOfficeFilter(event.target.value);
                  setUnitFilter("all");
                  setRows(null);
                  setGeneratedMeta(null);
                }}
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="all">All offices</option>
                {offices.map((office) => (
                  <option key={office} value={office}>
                    {office}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Unit
              <select
                value={unitFilter}
                onChange={(event) => {
                  setUnitFilter(event.target.value);
                  setRows(null);
                  setGeneratedMeta(null);
                }}
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              >
                <option value="all">All units</option>
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                Generate
              </button>
            </div>
          </form>

          {error ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          ) : null}

          {rows ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Patrollers Deployed
                  </h3>
                  <p className="text-xs text-muted">
                    {generatedMeta?.officeFilter} · {generatedMeta?.unitFilter} ·{" "}
                    {rows.length} unit{rows.length === 1 ? "" : "s"} ·{" "}
                    {generatedMeta?.generatedAt?.toLocaleString?.() ?? ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="rounded-lg border border-border/70 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background/80"
                  >
                    Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="rounded-lg border border-border/70 px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background/80"
                  >
                    Print / PDF
                  </button>
                </div>
              </div>

              <div className="overflow-auto rounded-xl border border-border/60">
                <table className="min-w-[1100px] w-full border-collapse text-left text-xs">
                  <thead className="bg-background/70 text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      {PATROLLERS_DEPLOYED_HEADERS.map((header) => (
                        <th
                          key={header}
                          className="whitespace-nowrap border-b border-border/60 px-3 py-2 font-semibold"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={PATROLLERS_DEPLOYED_HEADERS.length}
                          className="px-3 py-8 text-center text-sm text-muted"
                        >
                          No active patrol units match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={`${row.office}-${row.unit}-${row.plateNumber}-${row.number}`}
                          className="border-b border-border/40 odd:bg-background/20"
                        >
                          <td className="px-3 py-2 align-top text-foreground">
                            {row.number}
                          </td>
                          <td className="px-3 py-2 align-top text-foreground">
                            {row.office}
                          </td>
                          <td className="px-3 py-2 align-top text-foreground">
                            {row.unit}
                          </td>
                          <td className="px-3 py-2 align-top text-foreground">
                            {row.plateNumber}
                          </td>
                          <td className="px-3 py-2 align-top text-foreground">
                            {row.mobileNumber}
                          </td>
                          <td className="px-3 py-2 align-top text-foreground">
                            {row.callSign}
                          </td>
                          <td className="max-w-[220px] px-3 py-2 align-top text-foreground">
                            {row.visibilityPoints}
                          </td>
                          <td className="max-w-[240px] px-3 py-2 align-top text-foreground">
                            {row.designatedPatrolMember}
                          </td>
                          <td className="max-w-[280px] px-3 py-2 align-top text-foreground">
                            {row.shifting}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                Ready to generate
              </p>
              <p className="mt-1 text-xs text-muted">
                Choose filters, then click Generate to list active deployed
                patrollers.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-border/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border/70 px-4 py-2 text-sm text-muted transition hover:bg-background/80 hover:text-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
