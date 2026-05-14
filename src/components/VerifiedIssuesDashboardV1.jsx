import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Home,
  ImageOff,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  ThumbsUp,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://lateef-fastapi-docker.onrender.com";

function joinUrl(base, path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function statusClass(value) {
  const v = safeText(value).toLowerCase();

  if (["critical", "high", "urgent"].includes(v)) {
    return "bg-red-100 text-red-800 border-red-200";
  }

  if (["medium", "needs_review", "suggested", "pending"].includes(v)) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  if (["low", "monitor", "monitoring"].includes(v)) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (["approved", "verified", "active", "yes"].includes(v)) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  if (["mismatch", "rejected", "dismissed", "closed", "no"].includes(v)) {
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "primary", title }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-amber-500 text-white hover:bg-amber-600",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
  };

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary}`}
    >
      {children}
    </button>
  );
}

function LoadingBlock({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-slate-500">
      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

function ErrorBlock({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        Error
      </div>
      <p className="mt-2 whitespace-pre-wrap">{message}</p>
    </div>
  );
}

function SummaryCards({ issues }) {
  const stats = useMemo(() => {
    const total = issues.length;
    const high = issues.filter((i) =>
      ["high", "critical"].includes(safeText(i.severity).toLowerCase())
    ).length;
    const suggested = issues.filter(
      (i) => safeText(i.image_match_status).toLowerCase() === "suggested"
    ).length;
    const verified = issues.filter(
      (i) => safeText(i.image_match_status).toLowerCase() === "verified"
    ).length;
    const mismatch = issues.filter(
      (i) => safeText(i.image_match_status).toLowerCase() === "mismatch"
    ).length;
    const locked = issues.filter(
      (i) => safeText(i.baseline_locked).toLowerCase() === "yes"
    ).length;

    return { total, high, suggested, verified, mismatch, locked };
  }, [issues]);

  const cards = [
    { label: "Issues", value: stats.total, icon: Eye },
    { label: "High/Critical", value: stats.high, icon: AlertTriangle },
    { label: "Suggested Images", value: stats.suggested, icon: Clock },
    { label: "Verified Images", value: stats.verified, icon: ShieldCheck },
    { label: "Image Mismatch", value: stats.mismatch, icon: ImageOff },
    { label: "Baseline Locked", value: stats.locked, icon: Lock },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function CandidateImages({ issue, selectedImage, setSelectedImage }) {
  const candidates = Array.isArray(issue.candidate_image_urls)
    ? issue.candidate_image_urls
    : [];

  if (!candidates.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        No candidate images available.
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Candidate images
      </p>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
        {candidates.slice(0, 10).map((url) => {
          const fullUrl = joinUrl(API_BASE, url);
          const isSelected = selectedImage === url;

          return (
            <button
              type="button"
              key={url}
              onClick={() => setSelectedImage(url)}
              className={`overflow-hidden rounded-xl border bg-white ${
                isSelected ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200"
              }`}
            >
              <img
                src={fullUrl}
                alt="Candidate"
                className="h-20 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IssueCard({ issue, onRefresh, busyId, setBusyId }) {
  const [note, setNote] = useState("");
  const [selectedImage, setSelectedImage] = useState(issue.image_url || "");

  useEffect(() => {
    setSelectedImage(issue.verified_image_url || issue.image_url || "");
  }, [issue.id, issue.image_url, issue.verified_image_url]);

  async function patch(path, payload) {
    setBusyId(issue.id);

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.detail || JSON.stringify(data));
      }

      await onRefresh();
    } finally {
      setBusyId(null);
    }
  }

  async function homeownerReview(homeowner_decision, homeowner_image_decision = "accepted") {
    await patch(`/verified-issue/${issue.id}/homeowner-review`, {
      homeowner_decision,
      homeowner_image_decision,
      homeowner_note: note,
    });
  }

  async function adminReview(admin_review_status, admin_image_decision = "pending") {
    await patch(`/verified-issue/${issue.id}/admin-review`, {
      admin_review_status,
      admin_image_decision,
      verified_image_url:
        admin_image_decision === "approved" ? selectedImage || issue.image_url || "" : "",
      admin_note: note,
    });
  }

  async function imageVerify(image_match_status) {
    await patch(`/verified-issue/${issue.id}/image-verification`, {
      image_match_status,
      verified_image_url:
        image_match_status === "verified" ? selectedImage || issue.image_url || "" : "",
      admin_note: note,
    });
  }

  async function finalApproval(final_approval_status) {
    await patch(`/verified-issue/${issue.id}/final-approval`, {
      final_approval_status,
      final_approved_by: "dashboard-admin",
      admin_note: note,
    });
  }

  async function hideFromQueue() {
    await patch(`/verified-issue/${issue.id}/hide-from-review-queue`, {
      reason: "hidden_from_dashboard_review",
      admin_note: note || "Hidden from dashboard review queue.",
    });
  }

  const busy = busyId === issue.id;
  const imageUrl = issue.verified_image_url || issue.image_url || "";
  const fullImageUrl = imageUrl ? joinUrl(API_BASE, imageUrl) : "";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="xl:w-72">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {fullImageUrl ? (
              <img
                src={fullImageUrl}
                alt={issue.title || "Issue"}
                className="h-56 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-56 items-center justify-center text-slate-400">
                <ImageOff className="mr-2 h-5 w-5" />
                No image
              </div>
            )}
          </div>

          <div className="mt-3">
            <CandidateImages
              issue={issue}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                #{issue.id} · {issue.record_id}
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">
                {issue.title || "Untitled issue"}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {issue.section || "General"} · {issue.source_number || "No source number"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={statusClass(issue.severity)}>{issue.severity || "unknown"}</Badge>
              <Badge className={statusClass(issue.image_match_status)}>
                image: {issue.image_match_status || "unknown"}
              </Badge>
              <Badge className={statusClass(issue.admin_review_status)}>
                admin: {issue.admin_review_status || "pending"}
              </Badge>
              <Badge className={statusClass(issue.baseline_locked)}>
                baseline: {issue.baseline_locked || "no"}
              </Badge>
            </div>
          </div>

          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {issue.summary || "No summary available."}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Homeowner</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {issue.homeowner_decision || "unreviewed"}
              </p>
              <p className="text-xs text-slate-500">
                image: {issue.homeowner_image_decision || "unreviewed"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Admin</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {issue.admin_review_status || "pending"}
              </p>
              <p className="text-xs text-slate-500">
                image: {issue.admin_image_decision || "pending"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Final approval</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {issue.final_approval_status || "not_approved"}
              </p>
              <p className="text-xs text-slate-500">
                by: {issue.final_approved_by || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Current status</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {issue.current_status || "open"}
              </p>
              <p className="text-xs text-slate-500">
                risk: {issue.risk_level || "—"} / {issue.risk_score ?? "—"}
              </p>
            </div>
          </div>

          {(issue.homeowner_note || issue.admin_note) && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-semibold">Homeowner note</p>
                <p className="mt-1">{issue.homeowner_note || "—"}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Admin note</p>
                <p className="mt-1">{issue.admin_note || "—"}</p>
              </div>
            </div>
          )}

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add homeowner/admin note for this action..."
            className="mt-4 min-h-20 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
          />

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Home className="h-4 w-4" />
                Homeowner actions
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} variant="secondary" onClick={() => homeownerReview("confirmed", "accepted")}>
                  <ThumbsUp className="h-4 w-4" />
                  Confirm
                </Button>
                <Button disabled={busy} variant="warning" onClick={() => homeownerReview("needs_repair", "accepted")}>
                  <Wrench className="h-4 w-4" />
                  Needs Repair
                </Button>
                <Button disabled={busy} variant="secondary" onClick={() => homeownerReview("monitor", "accepted")}>
                  <Clock className="h-4 w-4" />
                  Monitor
                </Button>
                <Button disabled={busy} variant="success" onClick={() => homeownerReview("already_fixed", "accepted")}>
                  <CheckCircle2 className="h-4 w-4" />
                  Already Fixed
                </Button>
                <Button disabled={busy} variant="secondary" onClick={() => homeownerReview("not_a_concern", "accepted")}>
                  Not a Concern
                </Button>
                <Button disabled={busy} variant="danger" onClick={() => homeownerReview("image_mismatch", "mismatch")}>
                  <ImageOff className="h-4 w-4" />
                  Image Mismatch
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <UserCheck className="h-4 w-4" />
                Admin actions
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} variant="success" onClick={() => adminReview("approved", "approved")}>
                  <ShieldCheck className="h-4 w-4" />
                  Approve Issue + Image
                </Button>
                <Button disabled={busy} variant="secondary" onClick={() => adminReview("approved", "needs_review")}>
                  Approve Issue Only
                </Button>
                <Button disabled={busy} variant="success" onClick={() => imageVerify("verified")}>
                  Verify Selected Image
                </Button>
                <Button disabled={busy} variant="danger" onClick={() => imageVerify("mismatch")}>
                  Mark Image Mismatch
                </Button>
                <Button disabled={busy} variant="warning" onClick={() => adminReview("needs_review", "needs_review")}>
                  Needs Review
                </Button>
                <Button disabled={busy} variant="danger" onClick={() => adminReview("rejected", "mismatch")}>
                  Reject
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Lock className="h-4 w-4" />
                Final approval
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} variant="primary" onClick={() => finalApproval("approved")}>
                  <Lock className="h-4 w-4" />
                  Final Approve + Lock Baseline
                </Button>
                <Button disabled={busy} variant="danger" onClick={() => finalApproval("rejected")}>
                  <XCircle className="h-4 w-4" />
                  Final Reject
                </Button>
                <Button disabled={busy} variant="ghost" onClick={hideFromQueue}>
                  Hide From Queue
                </Button>
              </div>
            </div>
          </div>

          {busy && (
            <div className="mt-4 flex items-center text-sm text-slate-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Updating issue...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifiedIssuesDashboardV1() {
  const [mode, setMode] = useState("queue");
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState("");
  const [issues, setIssues] = useState([]);
  const [queueLimit, setQueueLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);

  async function loadHealth() {
    try {
      const [workflowRes, cleanupRes] = await Promise.all([
        fetch(`${API_BASE}/verification-workflow-health`),
        fetch(`${API_BASE}/review-queue-cleanup-health`),
      ]);

      const workflow = await workflowRes.json();
      const cleanup = await cleanupRes.json();

      setHealth({ workflow, cleanup });
    } catch (e) {
      setHealth({ error: e.message });
    }
  }

  async function loadRecords() {
    setRecordsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/verified-issues-records`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));

      setRecords(data.records || []);

      if (!selectedRecord && data.records?.[0]?.record_id) {
        setSelectedRecord(data.records[0].record_id);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRecordsLoading(false);
    }
  }

  async function loadQueue() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE}/verified-issues-review-queue?limit=${queueLimit}`
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));

      setIssues(data.issues || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecord(recordId = selectedRecord) {
    if (!recordId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/verified-issues/${encodeURIComponent(recordId)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));

      setIssues(data.issues || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrent() {
    await loadHealth();

    if (mode === "queue") {
      await loadQueue();
    } else {
      await loadRecord();
    }
  }

  async function hideOldNoise() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/review-queue-cleanup/hide-old-noise`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.detail || JSON.stringify(data));

      await refreshCurrent();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
    loadRecords();
  }, []);

  useEffect(() => {
    if (mode === "queue") {
      loadQueue();
    } else if (selectedRecord) {
      loadRecord(selectedRecord);
    }
  }, [mode, selectedRecord, queueLimit]);

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return issues;

    return issues.filter((issue) => {
      const blob = [
        issue.id,
        issue.record_id,
        issue.title,
        issue.section,
        issue.summary,
        issue.severity,
        issue.homeowner_decision,
        issue.admin_review_status,
        issue.image_match_status,
        issue.final_approval_status,
      ]
        .join(" ")
        .toLowerCase();

      return blob.includes(q);
    });
  }, [issues, search]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                HomeFax AI
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">
                Dashboard Review UI Wiring Pass 1
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Review homeowner decisions, approve images, manage admin review,
                final-approve baseline records, and clean the review queue.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={refreshCurrent} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="warning" onClick={hideOldNoise} disabled={loading}>
                <XCircle className="h-4 w-4" />
                Hide Old Noise
              </Button>
            </div>
          </div>
        </div>

        <ErrorBlock message={error} />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setMode("queue")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    mode === "queue" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  Admin Review Queue
                </button>
                <button
                  type="button"
                  onClick={() => setMode("record")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    mode === "record" ? "bg-slate-900 text-white" : "text-slate-600"
                  }`}
                >
                  Record View
                </button>
              </div>

              {mode === "record" && (
                <select
                  value={selectedRecord}
                  onChange={(e) => setSelectedRecord(e.target.value)}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  disabled={recordsLoading}
                >
                  <option value="">Select record</option>
                  {records.map((record) => (
                    <option key={record.record_id} value={record.record_id}>
                      {record.record_id} ({record.count})
                    </option>
                  ))}
                </select>
              )}

              {mode === "queue" && (
                <select
                  value={queueLimit}
                  onChange={(e) => setQueueLimit(Number(e.target.value))}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              )}
            </div>

            <div className="mt-4 flex items-center rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <Search className="mr-2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search issue title, record, severity, decision..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-900">System health</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Workflow schema</span>
                <Badge className={statusClass(health?.workflow?.schema_ready ? "yes" : "no")}>
                  {health?.workflow?.schema_ready ? "ready" : "check"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cleanup schema</span>
                <Badge className={statusClass(health?.cleanup?.schema_ready ? "yes" : "no")}>
                  {health?.cleanup?.schema_ready ? "ready" : "check"}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                API: <span className="font-mono">{API_BASE}</span>
              </div>
            </div>
          </div>
        </div>

        <SummaryCards issues={filteredIssues} />

        {loading ? (
          <LoadingBlock label="Loading issues..." />
        ) : (
          <div className="space-y-4">
            {filteredIssues.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                No issues found for the current filter.
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  busyId={busyId}
                  setBusyId={setBusyId}
                  onRefresh={refreshCurrent}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
