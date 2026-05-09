import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const API_BASE_URL = "https://lateef-fastapi-docker.onrender.com";

const DEFAULT_RECORD_ID =
  "pdf-6039-s-carpenter-st-inspection-report-by-88700c88";

const STATUS_OPTIONS = [
  "open",
  "monitoring",
  "scheduled",
  "repaired",
  "verified",
  "resolved",
];

const HOMEOWNER_DECISION_OPTIONS = [
  "unreviewed",
  "accepted",
  "rejected",
  "needs_help",
];

function getRiskBadgeClass(riskLevel) {
  const value = String(riskLevel || "LOW").toUpperCase();

  if (value === "CRITICAL") {
    return "bg-red-100 text-red-800 border-red-200";
  }

  if (value === "HIGH") {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }

  if (value === "MEDIUM") {
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }

  return "bg-green-100 text-green-800 border-green-200";
}

function getStatusBadgeClass(status) {
  const value = String(status || "open").toLowerCase();

  if (value === "resolved" || value === "verified") {
    return "bg-green-100 text-green-800 border-green-200";
  }

  if (value === "repaired" || value === "scheduled") {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (value === "monitoring") {
    return "bg-purple-100 text-purple-800 border-purple-200";
  }

  return "bg-slate-100 text-slate-800 border-slate-200";
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function cleanSummary(summary) {
  if (!summary) return "No summary available.";

  return String(summary)
    .replace(/\s+/g, " ")
    .replace(/Vasintino Johnson/g, "")
    .trim();
}

function IssueCard({ issue, onUpdate, updatingId }) {
  const [currentStatus, setCurrentStatus] = useState(
    issue.current_status || "open"
  );
  const [homeownerDecision, setHomeownerDecision] = useState(
    issue.homeowner_decision || "unreviewed"
  );
  const [homeownerNote, setHomeownerNote] = useState(
    issue.homeowner_note || ""
  );
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setCurrentStatus(issue.current_status || "open");
    setHomeownerDecision(issue.homeowner_decision || "unreviewed");
    setHomeownerNote(issue.homeowner_note || "");
  }, [issue]);

  const isUpdating = updatingId === issue.id;
  const summaryText = cleanSummary(issue.summary);

  async function handleSave() {
    await onUpdate(issue.id, {
      current_status: currentStatus,
      homeowner_decision: homeownerDecision,
      homeowner_note: homeownerNote,
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskBadgeClass(
                issue.risk_level
              )}`}
            >
              {issue.risk_level || "LOW"} · {issue.risk_score ?? 0}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                issue.current_status
              )}`}
            >
              {issue.current_status || "open"}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {issue.priority || "monitor"}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-bold text-slate-950">
            {issue.title || "Untitled issue"}
          </h3>

          <p className="mt-1 text-sm font-medium text-slate-600">
            {issue.section || "General"}
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-700">
            {expanded
              ? summaryText
              : `${summaryText.slice(0, 260)}${
                  summaryText.length > 260 ? "..." : ""
                }`}
          </p>

          {summaryText.length > 260 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              {expanded ? "Show less" : "Show full summary"}
            </button>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 lg:w-56">
          <div className="font-semibold text-slate-900">Issue #{issue.id}</div>
          <div className="mt-1">Severity: {issue.severity || "unknown"}</div>
          <div className="mt-1">Created: {formatDate(issue.created_at)}</div>
          <div className="mt-1">Updated: {formatDate(issue.updated_at)}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current status
          </span>
          <select
            value={currentStatus}
            onChange={(event) => setCurrentStatus(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Homeowner decision
          </span>
          <select
            value={homeownerDecision}
            onChange={(event) => setHomeownerDecision(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {HOMEOWNER_DECISION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? "Saving..." : "Save update"}
          </button>
        </div>
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Homeowner note
        </span>
        <textarea
          value={homeownerNote}
          onChange={(event) => setHomeownerNote(event.target.value)}
          rows={2}
          placeholder="Add homeowner note..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>
    </div>
  );
}

export default function VerifiedIssuesDashboardV1() {
  const [recordId, setRecordId] = useState(DEFAULT_RECORD_ID);
  const [queryRecordId, setQueryRecordId] = useState(DEFAULT_RECORD_ID);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadIssues(targetRecordId = queryRecordId) {
    const cleanRecordId = String(targetRecordId || "").trim();

    if (!cleanRecordId) {
      setError("Enter a record ID first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/verified-issues/${encodeURIComponent(cleanRecordId)}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to load verified issues.");
      }

      setIssues(Array.isArray(data.issues) ? data.issues : []);
      setQueryRecordId(cleanRecordId);
    } catch (err) {
      setError(err.message || "Failed to load verified issues.");
    } finally {
      setLoading(false);
    }
  }

  async function updateIssue(issueId, payload) {
    setUpdatingId(issueId);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/verified-issue/${issueId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to update issue.");
      }

      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue.id === issueId ? data.issue : issue
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update issue.");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadIssues(DEFAULT_RECORD_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredIssues = useMemo(() => {
    const searchValue = search.toLowerCase().trim();

    return issues.filter((issue) => {
      const matchesSearch =
        !searchValue ||
        String(issue.title || "").toLowerCase().includes(searchValue) ||
        String(issue.section || "").toLowerCase().includes(searchValue) ||
        String(issue.summary || "").toLowerCase().includes(searchValue);

      const matchesRisk =
        riskFilter === "all" ||
        String(issue.risk_level || "").toUpperCase() === riskFilter;

      const matchesStatus =
        statusFilter === "all" ||
        String(issue.current_status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesRisk && matchesStatus;
    });
  }, [issues, search, riskFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = issues.length;

    const high = issues.filter((issue) =>
      ["HIGH", "CRITICAL"].includes(
        String(issue.risk_level || "").toUpperCase()
      )
    ).length;

    const open = issues.filter(
      (issue) => String(issue.current_status || "").toLowerCase() === "open"
    ).length;

    const resolved = issues.filter(
      (issue) => String(issue.current_status || "").toLowerCase() === "resolved"
    ).length;

    return { total, high, open, resolved };
  }, [issues]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-blue-700">
                <ShieldCheck className="h-4 w-4" />
                HomeFax AI
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Verified Issues Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review parser-generated inspection issues, update homeowner
                decisions, and manage repair status from verified issue records.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadIssues(queryRecordId)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <FileText className="h-5 w-5 text-slate-500" />
              <div className="mt-3 text-2xl font-black">{stats.total}</div>
              <div className="text-sm text-slate-600">Total issues</div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="mt-3 text-2xl font-black">{stats.high}</div>
              <div className="text-sm text-orange-800">High/Critical</div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="mt-3 text-2xl font-black">{stats.open}</div>
              <div className="text-sm text-blue-800">Open</div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="mt-3 text-2xl font-black">{stats.resolved}</div>
              <div className="text-sm text-green-800">Resolved</div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Record ID
              </span>

              <input
                value={recordId}
                onChange={(event) => setRecordId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Risk
              </span>

              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All risk levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </span>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadIssues(recordId)}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Wrench className="h-4 w-4" />
                {loading ? "Loading..." : "Load"}
              </button>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search issues
            </span>

            <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Search className="h-4 w-4 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, section, or summary..."
                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              />
            </div>
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </section>

        <section className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 text-center text-sm font-semibold text-slate-600 shadow-sm">
              Loading verified issues...
            </div>
          ) : filteredIssues.length ? (
            filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onUpdate={updateIssue}
                updatingId={updatingId}
              />
            ))
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="text-lg font-black text-slate-950">
                No issues found
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Adjust filters or load a different record ID.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
