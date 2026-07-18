import React, { useEffect, useMemo, useState } from "react";
import HomeFaxStandardFindingCard from "./HomeFaxStandardFindingCard.jsx";

const DEFAULT_RECORD_ID =
  "pdf-6039-s-carpenter-st-inspection-report-by-big-ben-inspections-by-1f8a26dc";

function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/$/, "");
}

function getRecordIdFromUrl() {
  const params = new URLSearchParams(window.location.search);

  return (
    params.get("record_id") ||
    params.get("recordId") ||
    params.get("id") ||
    DEFAULT_RECORD_ID
  );
}

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function getLocation(issue) {
  const explicit = pickFirst(
    issue.standard_location_area,
    issue.location,
    issue.area,
    issue.room,
    issue.source_report_section,
    issue.location_area,
    issue.finding_location
  );

  if (explicit) return explicit;

  const system = pickFirst(issue.system, issue.standard_system);
  const component = pickFirst(issue.component, issue.standard_component);

  if (system && component) return `${system} / ${component}`;
  if (system) return system;
  if (component) return component;

  return "Location not specified";
}


function normalizeDecision(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getIssueDecision(issue) {
  const decision = normalizeDecision(issue?.homeowner_decision);

  if (decision && decision !== "unreviewed" && decision !== "open") {
    return decision;
  }

  const currentStatus = normalizeDecision(issue?.current_status);
  const status = normalizeDecision(issue?.status);
  const fallback = currentStatus || status;

  if (!fallback || fallback === "open" || fallback === "unreviewed") {
    return "unreviewed";
  }

  if (fallback === "monitoring") return "monitor";
  if (fallback === "needs_repair") return "repair_needed";
  if (fallback === "repaired") return "already_repaired";
  if (fallback === "dismissed") return "not_an_issue";
  if (fallback === "needs_image_review") return "wrong_photo";
  if (fallback === "image_review_needed") return "wrong_photo";
  if (fallback === "image_mismatch") return "wrong_photo";

  return fallback;
}

function decisionLabel(value) {
  const normalized = normalizeDecision(value);

  const labels = {
    all: "All",
    unreviewed: "Unreviewed",
    monitor: "Monitor",
    repair_needed: "Repair Needed",
    needs_contractor: "Needs Contractor",
    wrong_photo: "Wrong Photo",
    already_repaired: "Already Repaired",
    not_an_issue: "Not An Issue",
  };

  return labels[normalized] || normalized.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function decisionMatchesFilter(issue, filter) {
  const normalizedFilter = normalizeDecision(filter);
  const decision = getIssueDecision(issue);

  if (normalizedFilter === "all") return true;

  if (normalizedFilter === "repair_needed") {
    return decision === "repair_needed" || decision === "needs_repair";
  }

  if (normalizedFilter === "wrong_photo") {
    return decision === "wrong_photo" || decision === "image_mismatch" || decision === "image_review_needed";
  }

  if (normalizedFilter === "already_repaired") {
    return decision === "already_repaired" || decision === "repaired";
  }

  if (normalizedFilter === "not_an_issue") {
    return decision === "not_an_issue" || decision === "dismissed";
  }

  return decision === normalizedFilter;
}

const DECISION_FILTERS = [
  "all",
  "unreviewed",
  "monitor",
  "repair_needed",
  "needs_contractor",
  "wrong_photo",
  "already_repaired",
  "not_an_issue",
];


export default function HomeFaxStandardFindingsSection() {
  const apiBaseUrl = getApiBaseUrl();
  const recordId = getRecordIdFromUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [decisionFilter, setDecisionFilter] = useState("all");

  async function loadStandardFindings({ quiet = false } = {}) {
    if (!quiet) {
      setLoading(true);
    }

    setError("");

    try {
      const url = `${apiBaseUrl}/records/${encodeURIComponent(
        recordId
      )}/homefax-standard-report-preview-clean-v4?limit=100`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      setPayload(data);
    } catch (err) {
      setError(err.message || "Unable to load HomeFax standard findings.");
    } finally {
      if (!quiet) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!alive) return;
      await loadStandardFindings();
    }

    load();

    return () => {
      alive = false;
    };
  }, [apiBaseUrl, recordId]);

  const issues = payload?.issues || [];
  const totalFindings = issues.length;

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => decisionMatchesFilter(issue, decisionFilter));
  }, [issues, decisionFilter]);

  const filteredFindingsCount = filteredIssues.length;

  const countByDecision = (filter) =>
    issues.filter((issue) => decisionMatchesFilter(issue, filter)).length;

  const locationStats = useMemo(() => {
    const counts = new Map();

    for (const issue of issues) {
      const location = getLocation(issue);
      counts.set(location, (counts.get(location) || 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [issues]);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-bold text-slate-700">
          Loading HomeFax Standard Findings...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-sm font-bold text-red-800">
          Could not load HomeFax Standard Findings
        </div>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-700">
              HomeFax Standard Findings
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Source-Backed Issue Review
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Each card shows the original inspector finding, finding location,
              HomeFax explanation, recommended trade, monitoring plan, and
              evidence photos.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 px-5 py-4 text-white">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Total Findings
            </div>
            <div className="text-3xl font-black">{totalFindings}</div>
          </div>
        </div>

        {locationStats.length ? (
          <div className="mt-5">
            <div className="mb-2 text-sm font-black text-slate-800">
              Locations / Areas Found
            </div>

            <div className="flex flex-wrap gap-2">
              {locationStats.slice(0, 15).map((item) => (
                <span
                  key={item.location}
                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  {item.location}: {item.count}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-slate-950">Review Decision Filter</div>
            <div className="text-xs text-slate-500">
              Showing {filteredFindingsCount} of {totalFindings} standard findings.
            </div>
          </div>

          {decisionFilter !== "all" ? (
            <button
              type="button"
              onClick={() => setDecisionFilter("all")}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Clear filter
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {DECISION_FILTERS.map((filter) => {
            const active = decisionFilter === filter;
            const count = countByDecision(filter);

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setDecisionFilter(filter)}
                className={
                  active
                    ? "rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm"
                    : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                }
              >
                {decisionLabel(filter)}
                <span className={active ? "ml-2 text-white/80" : "ml-2 text-slate-400"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredFindingsCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div className="text-sm font-black text-slate-900">
            No findings match this decision filter.
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Try another filter or clear the current decision filter.
          </div>
        </div>
      ) : null}

      <div className="grid gap-5">
        {filteredIssues.map((issue) => (
          <HomeFaxStandardFindingCard
            key={issue.id || `${issue.source_item_number}-${issue.title}`}
            issue={issue}
            apiBaseUrl={apiBaseUrl}
            onRefresh={() => loadStandardFindings({ quiet: true })}
          />
        ))}
      </div>
    </section>
  );
}
