import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_HOMEFAX_API_BASE ||
  "https://lateef-fastapi-docker.onrender.com";

const DEFAULT_RECORD_ID =
  "pdf-6039-s-carpenter-st-inspection-report-by-a914edd4";

function getInitialRecordId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("record_id");
  const fromStorage = window.localStorage.getItem("homefax_last_record_id");

  return fromUrl || fromStorage || DEFAULT_RECORD_ID;
}

function normalizeStatus(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeSeverity(value) {
  return String(value || "").toLowerCase().trim();
}

function isHighOrCritical(issue) {
  const severity = normalizeSeverity(issue.severity);
  const riskLevel = normalizeSeverity(issue.risk_level);

  return (
    severity === "high" ||
    severity === "critical" ||
    riskLevel === "high" ||
    riskLevel === "critical"
  );
}

function isOpenIssue(issue) {
  const currentStatus = normalizeStatus(issue.current_status || issue.status);

  return (
    currentStatus === "open" ||
    currentStatus === "new" ||
    currentStatus === "monitoring" ||
    currentStatus === "needs_repair" ||
    currentStatus === "repair" ||
    currentStatus === ""
  );
}

function isResolvedIssue(issue) {
  const currentStatus = normalizeStatus(issue.current_status || issue.status);

  return (
    currentStatus === "resolved" ||
    currentStatus === "closed" ||
    currentStatus === "fixed"
  );
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function titleCaseFromRecordId(recordId) {
  if (!recordId) return "Unknown record";

  return recordId
    .replace(/^pdf-/i, "")
    .replace(/-[a-f0-9]{8,}$/i, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateMiddle(value, maxLength = 44) {
  const text = String(value || "");

  if (text.length <= maxLength) return text;

  const first = Math.ceil(maxLength / 2) - 2;
  const last = Math.floor(maxLength / 2) - 2;

  return `${text.slice(0, first)}...${text.slice(text.length - last)}`;
}

function riskBadgeClass(issue) {
  const severity = normalizeSeverity(issue.severity);
  const riskLevel = normalizeSeverity(issue.risk_level);

  if (severity === "critical" || riskLevel === "critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (severity === "high" || riskLevel === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (severity === "medium" || riskLevel === "medium") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function statusBadgeClass(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "resolved" || normalized === "fixed") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (normalized === "monitoring") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (normalized === "urgent") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getIssueTitle(issue) {
  return (
    issue.title ||
    issue.issueTitle ||
    issue.issue_title ||
    issue.finding_title ||
    issue.type ||
    "Inspection issue"
  );
}

function getIssueSection(issue) {
  return (
    issue.section ||
    issue.system ||
    issue.component ||
    issue.location ||
    "General"
  );
}

function getIssueSummary(issue) {
  return (
    issue.summary ||
    issue.notes ||
    issue.description ||
    "No summary available."
  );
}

function getRiskLabel(issue) {
  const riskLevel = String(issue.risk_level || "").toUpperCase();
  const severity = String(issue.severity || "").toUpperCase();
  const score = issue.risk_score ?? issue.score ?? null;

  const label = riskLevel || severity || "INFO";

  if (score !== null && score !== undefined && score !== "") {
    return `${label} · ${score}`;
  }

  return label;
}

function StatCard({ icon: Icon, label, value, tone }) {
  const toneClass =
    tone === "orange"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "green"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <Icon className="mb-5 h-6 w-6" />
      <div className="text-3xl font-black text-slate-950">{value}</div>
      <div className="mt-1 text-base font-medium">{label}</div>
    </div>
  );
}

function IssueCard({ issue, draft, onDraftChange, onSave, onResolve, saving }) {
  const title = getIssueTitle(issue);
  const section = getIssueSection(issue);
  const summary = getIssueSummary(issue);

  const currentStatus =
    draft.current_status ?? issue.current_status ?? issue.status ?? "open";

  const homeownerDecision =
    draft.homeowner_decision ?? issue.homeowner_decision ?? "unreviewed";

  const homeownerNote =
    draft.homeowner_note ?? issue.homeowner_note ?? "";

  const adminReviewStatus =
    draft.admin_review_status ?? issue.admin_review_status ?? "pending";

  const adminNote =
    draft.admin_note ?? issue.admin_note ?? "";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_230px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-sm font-bold ${riskBadgeClass(
                issue
              )}`}
            >
              {getRiskLabel(issue)}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-sm font-bold ${statusBadgeClass(
                currentStatus
              )}`}
            >
              {currentStatus}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-700">
              {issue.priority || "review"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-sm font-bold ${statusBadgeClass(
                adminReviewStatus
              )}`}
            >
              admin: {adminReviewStatus}
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            {title}
          </h2>

          <p className="mt-2 text-base font-semibold text-slate-600">
            {section}
          </p>

          <p className="mt-5 max-w-5xl text-base leading-7 text-slate-700">
            {summary}
          </p>

          <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Current Status
              </span>
              <select
                value={currentStatus}
                onChange={(event) =>
                  onDraftChange(issue.id, "current_status", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="open">open</option>
                <option value="monitoring">monitoring</option>
                <option value="needs_repair">needs repair</option>
                <option value="repair_scheduled">repair scheduled</option>
                <option value="resolved">resolved</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Homeowner Decision
              </span>
              <select
                value={homeownerDecision}
                onChange={(event) =>
                  onDraftChange(
                    issue.id,
                    "homeowner_decision",
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="unreviewed">unreviewed</option>
                <option value="accepted">accepted</option>
                <option value="needs_repair">needs repair</option>
                <option value="monitor">monitor</option>
                <option value="already_fixed">already fixed</option>
                <option value="not_a_concern">not a concern</option>
                <option value="image_mismatch">image mismatch</option>
              </select>
            </label>

            <button
              type="button"
              disabled={saving}
              onClick={() => onSave(issue.id)}
              className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-base font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-7"
            >
              {saving ? "Saving..." : "Save update"}
            </button>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Homeowner Note
            </span>
            <textarea
              value={homeownerNote}
              onChange={(event) =>
                onDraftChange(issue.id, "homeowner_note", event.target.value)
              }
              placeholder="Add homeowner note..."
              className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center gap-2 text-base font-black text-slate-950">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Admin Review
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.55fr_1fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Admin Status
                </span>
                <select
                  value={adminReviewStatus}
                  onChange={(event) =>
                    onDraftChange(
                      issue.id,
                      "admin_review_status",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="needs_review">needs review</option>
                  <option value="rejected">rejected</option>
                  <option value="resolved">resolved</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Admin Note
                </span>
                <input
                  value={adminNote}
                  onChange={(event) =>
                    onDraftChange(issue.id, "admin_note", event.target.value)
                  }
                  placeholder="Internal admin note..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={() => onResolve(issue.id)}
                className="mt-6 rounded-xl bg-green-600 px-5 py-3 text-base font-black text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-7"
              >
                Mark resolved
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
          <div className="text-base font-black text-slate-950">
            Issue #{issue.id}
          </div>

          <div className="mt-2 space-y-1">
            <p>
              <span className="font-semibold">Severity:</span>{" "}
              {issue.severity || "unknown"}
            </p>
            <p>
              <span className="font-semibold">Created:</span>{" "}
              {formatDate(issue.created_at)}
            </p>
            <p>
              <span className="font-semibold">Updated:</span>{" "}
              {formatDate(issue.updated_at)}
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}

export default function VerifiedIssuesDashboardV1() {
  const [recordId, setRecordId] = useState(getInitialRecordId);
  const [recordInput, setRecordInput] = useState(getInitialRecordId);
  const [issues, setIssues] = useState([]);
  const [recordOptions, setRecordOptions] = useState([]);
  const [riskFilter, setRiskFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingIssueId, setSavingIssueId] = useState(null);

  const directLink = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}?record_id=${encodeURIComponent(
      recordId
    )}`;
  }, [recordId]);

  async function fetchRecordIssues(nextRecordId = recordId) {
    if (!nextRecordId) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE}/verified-issues/${encodeURIComponent(nextRecordId)}`
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.detail || data.message || "Unable to load issues.");
      }

      const nextIssues = Array.isArray(data.issues) ? data.issues : [];

      setIssues(nextIssues);
      setRecordId(nextRecordId);
      setRecordInput(nextRecordId);
      window.localStorage.setItem("homefax_last_record_id", nextRecordId);

      const url = new URL(window.location.href);
      url.searchParams.set("record_id", nextRecordId);
      window.history.replaceState({}, "", url.toString());

      setDrafts({});
    } catch (err) {
      setError(err.message || "Unable to load verified issues.");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecordOptions() {
    setRecordsLoading(true);

    const candidateUrls = [
      `${API_BASE}/verified-issues-records`,
      `${API_BASE}/verified-issues/records`,
      `${API_BASE}/verified-issue-records`,
    ];

    for (const url of candidateUrls) {
      try {
        const response = await fetch(url);

        if (!response.ok) continue;

        const data = await response.json();

        const records =
          data.records ||
          data.record_ids ||
          data.items ||
          data.data ||
          [];

        if (Array.isArray(records) && records.length > 0) {
          const normalized = records
            .map((record) => {
              if (typeof record === "string") {
                return {
                  record_id: record,
                  label: titleCaseFromRecordId(record),
                  total: null,
                };
              }

              return {
                record_id:
                  record.record_id ||
                  record.recordId ||
                  record.id ||
                  record.value,
                label:
                  record.label ||
                  record.name ||
                  titleCaseFromRecordId(
                    record.record_id || record.recordId || record.id
                  ),
                total:
                  record.total ||
                  record.count ||
                  record.issue_count ||
                  record.issues_count ||
                  null,
              };
            })
            .filter((record) => record.record_id);

          setRecordOptions(normalized);
          setRecordsLoading(false);
          return;
        }
      } catch {
        // Try the next endpoint.
      }
    }

    setRecordOptions([]);
    setRecordsLoading(false);
  }

  useEffect(() => {
    fetchRecordIssues(recordId);
    fetchRecordOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentRecordStats = useMemo(() => {
    const currentIssues = Array.isArray(issues) ? issues : [];

    const total = currentIssues.length;
    const highCritical = currentIssues.filter(isHighOrCritical).length;
    const open = currentIssues.filter(isOpenIssue).length;
    const resolved = currentIssues.filter(isResolvedIssue).length;

    const lastUpdated =
      currentIssues
        .map((issue) => issue.updated_at || issue.created_at)
        .filter(Boolean)
        .sort()
        .at(-1) || null;

    return {
      total,
      highCritical,
      open,
      resolved,
      lastUpdated,
    };
  }, [issues]);

  const sectionStats = useMemo(() => {
    const map = new Map();

    for (const issue of issues) {
      const section = getIssueSection(issue);

      if (!map.has(section)) {
        map.set(section, {
          section,
          total: 0,
          high: 0,
          open: 0,
        });
      }

      const entry = map.get(section);

      entry.total += 1;

      if (isHighOrCritical(issue)) {
        entry.high += 1;
      }

      if (isOpenIssue(issue)) {
        entry.open += 1;
      }
    }

    return Array.from(map.values())
      .sort((a, b) => {
        if (b.high !== a.high) return b.high - a.high;
        return b.total - a.total;
      })
      .slice(0, 8);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    const query = searchText.toLowerCase().trim();

    return issues.filter((issue) => {
      if (riskFilter !== "all") {
        const severity = normalizeSeverity(issue.severity);
        const riskLevel = normalizeSeverity(issue.risk_level);

        if (riskFilter === "high_critical") {
          if (!isHighOrCritical(issue)) return false;
        } else if (severity !== riskFilter && riskLevel !== riskFilter) {
          return false;
        }
      }

      if (statusFilter !== "all") {
        const status = normalizeStatus(issue.current_status || issue.status);

        if (statusFilter === "open") {
          if (!isOpenIssue(issue)) return false;
        } else if (statusFilter === "resolved") {
          if (!isResolvedIssue(issue)) return false;
        } else if (status !== statusFilter) {
          return false;
        }
      }

      if (query) {
        const searchable = [
          issue.id,
          getIssueTitle(issue),
          getIssueSection(issue),
          getIssueSummary(issue),
          issue.severity,
          issue.risk_level,
          issue.priority,
          issue.current_status,
          issue.homeowner_decision,
          issue.admin_review_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [issues, riskFilter, statusFilter, searchText]);

  function updateDraft(issueId, field, value) {
    setDrafts((current) => ({
      ...current,
      [issueId]: {
        ...(current[issueId] || {}),
        [field]: value,
      },
    }));
  }

  async function saveIssue(issueId, extraPayload = {}) {
    const issue = issues.find((item) => item.id === issueId);

    if (!issue) return;

    const draft = drafts[issueId] || {};

    const payload = {
      current_status:
        draft.current_status ?? issue.current_status ?? issue.status ?? "open",
      homeowner_decision:
        draft.homeowner_decision ?? issue.homeowner_decision ?? "unreviewed",
      homeowner_note: draft.homeowner_note ?? issue.homeowner_note ?? "",
      admin_review_status:
        draft.admin_review_status ?? issue.admin_review_status ?? "pending",
      admin_note: draft.admin_note ?? issue.admin_note ?? "",
      ...extraPayload,
    };

    setSavingIssueId(issueId);
    setError("");
    setNotice("");

    try {
      let response = await fetch(`${API_BASE}/verified-issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        response = await fetch(`${API_BASE}/verified-issues/${issueId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.detail || data.message || "Unable to save issue.");
      }

      setNotice("Issue updated.");
      await fetchRecordIssues(recordId);
    } catch (err) {
      setError(err.message || "Unable to save issue.");
    } finally {
      setSavingIssueId(null);
    }
  }

  async function markResolved(issueId) {
    await saveIssue(issueId, {
      current_status: "resolved",
      admin_review_status: "resolved",
    });
  }

  async function handleLoadRecord() {
    const trimmed = recordInput.trim();

    if (!trimmed) {
      setError("Please enter a record ID.");
      return;
    }

    await fetchRecordIssues(trimmed);
  }

  async function handleCopyDirectLink() {
    try {
      await navigator.clipboard.writeText(directLink);
      setNotice("Direct link copied.");
    } catch {
      setError("Could not copy direct link.");
    }
  }

  const selectedRecordLabel = titleCaseFromRecordId(recordId);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-blue-700">
                <ShieldCheck className="h-5 w-5" />
                HomeFax AI
              </div>

              <h1 className="text-4xl font-black tracking-tight text-slate-950">
                Verified Issues Dashboard
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Review parser-generated inspection issues, switch between
                records, update homeowner decisions, and manage repair status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchRecordIssues(recordId)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              Refresh
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={FileText}
              label="Total issues"
              value={currentRecordStats.total}
              tone="slate"
            />
            <StatCard
              icon={AlertTriangle}
              label="High/Critical"
              value={currentRecordStats.highCritical}
              tone="orange"
            />
            <StatCard
              icon={Clock}
              label="Open"
              value={currentRecordStats.open}
              tone="blue"
            />
            <StatCard
              icon={CheckCircle2}
              label="Resolved"
              value={currentRecordStats.resolved}
              tone="green"
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-lg font-black text-slate-950">
              <Database className="h-5 w-5 text-blue-600" />
              Record Selector v2
            </div>

            <button
              type="button"
              onClick={handleCopyDirectLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              <Copy className="h-4 w-4" />
              Copy direct link
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.75fr_0.75fr_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Select Record
              </span>
              <select
                value={recordId}
                onChange={(event) => {
                  setRecordInput(event.target.value);
                  fetchRecordIssues(event.target.value);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value={recordId}>
                  {truncateMiddle(selectedRecordLabel, 38)} ·{" "}
                  {currentRecordStats.total} issues
                </option>

                {recordOptions
                  .filter((record) => record.record_id !== recordId)
                  .map((record) => (
                    <option key={record.record_id} value={record.record_id}>
                      {truncateMiddle(record.label, 38)}
                      {record.total !== null ? ` · ${record.total} issues` : ""}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Or Paste Record ID
              </span>
              <input
                value={recordInput}
                onChange={(event) => setRecordInput(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="pdf-..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Risk
              </span>
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All risk levels</option>
                <option value="high_critical">High/Critical</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="monitoring">Monitoring</option>
                <option value="needs_repair">Needs repair</option>
                <option value="resolved">Resolved</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleLoadRecord}
              disabled={loading}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-7"
            >
              <Wrench className="h-5 w-5" />
              Load
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-base font-black text-slate-950">
              Current record: {selectedRecordLabel}
            </div>

            <div className="mt-1 text-sm font-semibold text-slate-500">
              {recordId}
            </div>

            <div className="mt-5 grid gap-4 text-base text-slate-700 md:grid-cols-4">
              <div>
                <span className="font-black">{currentRecordStats.total}</span>{" "}
                total issues
              </div>
              <div>
                <span className="font-black">
                  {currentRecordStats.highCritical}
                </span>{" "}
                high/critical
              </div>
              <div>
                <span className="font-black">{currentRecordStats.open}</span>{" "}
                open
              </div>
              <div>
                Last updated: {formatDate(currentRecordStats.lastUpdated)}
              </div>
            </div>
          </div>

          {sectionStats.length > 0 && (
            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 text-base font-black text-slate-950">
                Issue counts by section
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {sectionStats.map((item) => (
                  <div
                    key={item.section}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="font-black text-slate-950">
                      {item.section}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.total} total · {item.high} high · {item.open} open
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
              Search Issues
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search title, section, or summary..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </label>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {notice}
            </div>
          )}

          {recordsLoading && (
            <div className="mt-5 text-sm font-semibold text-slate-500">
              Loading record list...
            </div>
          )}
        </section>

        <section className="space-y-6">
          {loading ? (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 font-semibold text-slate-600">
                Loading verified issues...
              </p>
            </div>
          ) : filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                draft={drafts[issue.id] || {}}
                onDraftChange={updateDraft}
                onSave={saveIssue}
                onResolve={markResolved}
                saving={savingIssueId === issue.id}
              />
            ))
          ) : (
            <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
              <div className="text-xl font-black text-slate-950">
                No issues found
              </div>
              <p className="mt-2 text-slate-600">
                Adjust filters or load a different record ID.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
