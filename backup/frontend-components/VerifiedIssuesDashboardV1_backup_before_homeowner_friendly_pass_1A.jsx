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
  import.meta.env.VITE_API_BASE_URL ||
  "https://lateef-fastapi-docker.onrender.com";

function joinUrl(base, path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function isLocked(issue) {
  return safeText(issue?.baseline_locked).toLowerCase() === "yes";
}

function normalizeIssueText(value) {
  return safeText(value).toLowerCase();
}

function getContractorType(issue) {
  const text = normalizeIssueText(
    [
      issue.title,
      issue.section,
      issue.summary,
      issue.location,
      issue.type,
    ].join(" ")
  );

  if (text.includes("electrical") || text.includes("breaker") || text.includes("panel") || text.includes("wiring")) {
    return "Licensed electrician";
  }

  if (text.includes("plumbing") || text.includes("leak") || text.includes("water") || text.includes("valve") || text.includes("supply")) {
    return "Licensed plumber";
  }

  if (text.includes("roof") || text.includes("shingle") || text.includes("flashing") || text.includes("gutter")) {
    return "Qualified roofing contractor";
  }

  if (text.includes("hvac") || text.includes("furnace") || text.includes("air conditioning") || text.includes("cooling") || text.includes("heating")) {
    return "Licensed HVAC contractor";
  }

  if (text.includes("foundation") || text.includes("structure") || text.includes("settlement") || text.includes("crack")) {
    return "Structural contractor or structural engineer";
  }

  if (text.includes("mold") || text.includes("moisture") || text.includes("humidity")) {
    return "Moisture/mold specialist";
  }

  return "Qualified contractor";
}

function getHomeownerUrgency(issue) {
  const severity = normalizeIssueText(issue.severity);
  const risk = normalizeIssueText(issue.risk_level);
  const text = normalizeIssueText([issue.title, issue.summary, issue.section].join(" "));

  if (
    severity === "critical" ||
    risk === "critical" ||
    text.includes("active leak") ||
    text.includes("fire") ||
    text.includes("shock") ||
    text.includes("unsafe")
  ) {
    return {
      label: "Urgent",
      className: "bg-red-100 text-red-800 border-red-200",
      explanation: "This should be reviewed quickly because it may affect safety or cause additional damage.",
    };
  }

  if (severity === "high" || risk === "high") {
    return {
      label: "High priority",
      className: "bg-orange-100 text-orange-800 border-orange-200",
      explanation: "This should be reviewed by a qualified professional soon.",
    };
  }

  if (severity === "medium") {
    return {
      label: "Plan repair",
      className: "bg-amber-100 text-amber-800 border-amber-200",
      explanation: "This may not be urgent today, but it should be planned and corrected.",
    };
  }

  return {
    label: "Monitor",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    explanation: "Keep an eye on this item and address it during routine maintenance or if it worsens.",
  };
}

function getPlainLanguageFinding(issue) {
  const title = safeText(issue.title || issue.issueTitle || "Inspection finding");
  const text = normalizeIssueText([title, issue.section, issue.summary].join(" "));
  const contractor = getContractorType(issue);
  const urgency = getHomeownerUrgency(issue);

  let plainTitle = title;
  let whatItMeans = "The inspection report flagged this item as something that should be reviewed.";
  let whyItMatters = "Inspection findings can affect safety, maintenance costs, insurance, resale value, or long-term property condition.";
  let nextStep = `Have a ${contractor.toLowerCase()} review this item and recommend the proper correction.`;

  if (text.includes("open breaker") || text.includes("knockout") || text.includes("filler plate")) {
    plainTitle = "Open space in the electrical panel";
    whatItMeans = "There appears to be an opening in the electrical panel where a cover or filler plate should be installed.";
    whyItMatters = "Openings in an electrical panel can expose energized parts and create a shock or safety hazard.";
    nextStep = "Have a licensed electrician install the proper filler plate and check the panel for safety.";
  } else if (text.includes("improper wiring") || text.includes("wiring")) {
    plainTitle = "Electrical wiring needs review";
    whatItMeans = "The inspection report found wiring that may not be installed correctly or safely.";
    whyItMatters = "Electrical defects can increase the risk of shock, overheating, or fire.";
    nextStep = "Have a licensed electrician evaluate and correct the wiring.";
  } else if (text.includes("active water leak") || text.includes("leak")) {
    plainTitle = "Active water leak";
    whatItMeans = "The report indicates water is leaking from a plumbing component or nearby area.";
    whyItMatters = "Leaks can lead to water damage, mold, higher utility bills, and hidden deterioration.";
    nextStep = "Have a licensed plumber inspect and repair the leak as soon as possible.";
  } else if (text.includes("main water supply") || text.includes("water supply")) {
    plainTitle = "Main water supply needs repair";
    whatItMeans = "The inspection found a concern with the water supply system or shutoff area.";
    whyItMatters = "Problems at the main water supply can make leaks harder to control and may affect the whole home.";
    nextStep = "Have a licensed plumber review the main water shutoff and supply components.";
  } else if (text.includes("roof") || text.includes("shingle") || text.includes("roof-covering")) {
    plainTitle = "Roof covering needs repair";
    whatItMeans = "The inspection found missing, damaged, or improperly installed roof-covering material.";
    whyItMatters = "Roof defects can allow water into the home and lead to interior damage or mold.";
    nextStep = "Have a qualified roofing contractor inspect the area and repair or replace damaged materials.";
  } else if (text.includes("flashing")) {
    plainTitle = "Missing or defective flashing";
    whatItMeans = "Flashing is the material that helps keep water out where roof surfaces meet walls, vents, chimneys, or edges.";
    whyItMatters = "Missing or damaged flashing is a common source of leaks.";
    nextStep = "Have a qualified roofing contractor inspect and repair the flashing.";
  } else if (text.includes("gutter")) {
    plainTitle = "Gutter needs repair";
    whatItMeans = "The gutter system may be damaged, loose, missing, or not draining properly.";
    whyItMatters = "Poor gutter drainage can send water toward the foundation, siding, or roof edges.";
    nextStep = "Have a gutter or roofing contractor repair and confirm proper drainage.";
  } else if (text.includes("old system")) {
    plainTitle = "Older system noted";
    whatItMeans = "The inspector noted that this system or component appears older or near the end of its typical service life.";
    whyItMatters = "Older systems may be more likely to fail, need repairs, or require replacement planning.";
    nextStep = `Have a ${contractor.toLowerCase()} evaluate condition, remaining useful life, and replacement options.`;
  } else if (text.includes("major defect") || text.includes("material defect")) {
    plainTitle = "Significant defect needs professional review";
    whatItMeans = "The inspector considered this a more significant issue that should not be ignored.";
    whyItMatters = "Significant defects can affect safety, function, cost, or long-term reliability.";
    nextStep = `Have a ${contractor.toLowerCase()} evaluate the issue and provide repair recommendations.`;
  }

  return {
    plainTitle,
    whatItMeans,
    whyItMatters,
    nextStep,
    contractor,
    urgency,
  };
}

function getImageTrustLabel(issue) {
  const status = normalizeIssueText(issue.image_match_status);
  const hasVerified = Boolean(issue.verified_image_url);

  if (hasVerified || status === "verified") {
    return {
      label: "Admin verified photo",
      className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      explanation: "This image has been reviewed and approved by admin.",
    };
  }

  if (status === "mismatch") {
    return {
      label: "Image mismatch",
      className: "bg-red-100 text-red-800 border-red-200",
      explanation: "This image was marked as not matching the finding.",
    };
  }

  return {
    label: "AI suggested photo",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    explanation: "This photo is a suggested match and should not be treated as verified until admin approves it.",
  };
}

function statusClass(value) {
  const v = safeText(value).toLowerCase();

  if (["critical", "high", "urgent"].includes(v)) {
    return "bg-red-100 text-red-800 border-red-200";
  }

  if (["medium", "needs_review", "suggested", "pending", "not_approved"].includes(v)) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }

  if (["low", "monitor", "monitoring"].includes(v)) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }

  if (["approved", "verified", "active", "yes", "complete"].includes(v)) {
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
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CandidateImages({ issue, selectedImage, setSelectedImage, disabled }) {
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
        {candidates.slice(0, 10).map((url, index) => {
          const fullUrl = joinUrl(API_BASE, url);
          const isSelected = selectedImage === url;

          return (
            <button
              type="button"
              key={`${url}-${index}`}
              onClick={() => setSelectedImage(url)}
              disabled={disabled}
              className={`overflow-hidden rounded-xl border bg-white disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border-emerald-500 ring-2 ring-emerald-200"
                  : "border-slate-200"
              }`}
              title={`Select candidate image ${index + 1}`}
            >
              <img
                src={fullUrl}
                alt={`Candidate ${index + 1}`}
                className="h-20 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="px-2 py-1 text-xs font-semibold text-slate-600">
                #{index + 1}
              </div>
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

  const friendly = getPlainLanguageFinding(issue);
  const imageTrust = getImageTrustLabel(issue);

  useEffect(() => {
    setSelectedImage(issue.verified_image_url || issue.image_url || "");
    setNote("");
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

      if (!res.ok || data?.success === false) {
        throw new Error(data?.detail || data?.message || JSON.stringify(data));
      }

      await onRefresh();
      return data;
    } finally {
      setBusyId(null);
    }
  }

  async function homeownerReview(homeowner_decision, homeowner_image_decision = "accepted") {
    if (isLocked(issue)) {
      alert("This issue is baseline locked and cannot be changed.");
      return;
    }

    await patch(`/verified-issue/${issue.id}/homeowner-review`, {
      homeowner_decision,
      homeowner_image_decision,
      homeowner_note: note,
    });
  }

  async function adminReview(admin_review_status, admin_image_decision = "pending") {
    if (isLocked(issue)) {
      alert("This issue is baseline locked and cannot be changed.");
      return;
    }

    await patch(`/verified-issue/${issue.id}/admin-review`, {
      admin_review_status,
      admin_image_decision,
      verified_image_url:
        admin_image_decision === "approved"
          ? selectedImage || issue.image_url || ""
          : "",
      admin_note: note,
    });
  }

  async function imageVerify(image_match_status) {
    if (isLocked(issue)) {
      alert("This issue is baseline locked and cannot be changed.");
      return;
    }

    await patch(`/verified-issue/${issue.id}/image-verification`, {
      image_match_status,
      verified_image_url:
        image_match_status === "verified"
          ? selectedImage || issue.image_url || ""
          : "",
      admin_note: note,
    });
  }

  async function finalApproval(final_approval_status) {
    if (isLocked(issue) && final_approval_status === "approved") {
      alert("This issue is already baseline locked.");
      return;
    }

    if (
      final_approval_status === "approved" &&
      safeText(issue.admin_review_status).toLowerCase() !== "approved"
    ) {
      alert("Admin review must be approved before final approval.");
      return;
    }

    await patch(`/verified-issue/${issue.id}/final-approval`, {
      final_approval_status,
      final_approved_by: "dashboard-admin",
      admin_note: note,
    });
  }

  async function hideFromQueue() {
    if (isLocked(issue)) {
      alert("This issue is baseline locked and cannot be hidden.");
      return;
    }

    await patch(`/verified-issue/${issue.id}/hide-from-review-queue`, {
      reason: "hidden_from_dashboard_review",
      admin_note: note || "Hidden from dashboard review queue.",
    });
  }

  const busy = busyId === issue.id;
  const locked = isLocked(issue);

  const imageUrl = issue.verified_image_url || issue.image_url || "";
  const fullImageUrl = imageUrl ? joinUrl(API_BASE, imageUrl) : "";
  const selectedFullImageUrl = selectedImage ? joinUrl(API_BASE, selectedImage) : "";
  const verifiedFullImageUrl = issue.verified_image_url
    ? joinUrl(API_BASE, issue.verified_image_url)
    : "";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {fullImageUrl ? (
              <img
                src={fullImageUrl}
                alt={friendly.plainTitle || issue.title || "Issue"}
                className="h-64 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-slate-400">
                <ImageOff className="mr-2 h-5 w-5" />
                No image
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Photo status
              </p>
              <Badge className={imageTrust.className}>{imageTrust.label}</Badge>
            </div>
            <p className="text-sm leading-5 text-slate-600">
              {imageTrust.explanation}
            </p>
          </div>

          <CandidateImages
            issue={issue}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            disabled={busy || locked}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                #{issue.id} · {issue.record_id}
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">
                {friendly.plainTitle}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Original report wording: {issue.title || "Untitled issue"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {issue.section || "General"} · {issue.source_number || "No source number"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={friendly.urgency.className}>
                {friendly.urgency.label}
              </Badge>
              <Badge className={statusClass(issue.severity)}>
                report severity: {issue.severity || "unknown"}
              </Badge>
              <Badge className={statusClass(issue.baseline_locked)}>
                baseline: {issue.baseline_locked || "no"}
              </Badge>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                What this means
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-950">
                {friendly.whatItMeans}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                Why it matters
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-950">
                {friendly.whyItMatters}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Recommended next step
              </p>
              <p className="mt-2 text-sm leading-6 text-emerald-950">
                {friendly.nextStep}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Homeowner summary
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Who to call: <span className="font-semibold text-slate-900">{friendly.contractor}</span>
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Priority: <span className="font-semibold text-slate-900">{friendly.urgency.explanation}</span>
                </p>
              </div>

              {locked ? (
                <Badge className="border-slate-900 bg-slate-900 text-white">
                  Baseline locked
                </Badge>
              ) : issue.verified_image_url ? (
                <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                  Admin verified image
                </Badge>
              ) : (
                <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                  Needs admin image review
                </Badge>
              )}
            </div>
          </div>

          <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">
              Show original inspector language
            </summary>
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              {issue.summary || "No original summary available."}
            </p>
          </details>

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
              <p className="text-xs font-semibold uppercase text-slate-500">Risk</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {issue.risk_level || "—"} / {issue.risk_score ?? "—"}
              </p>
              <p className="text-xs text-slate-500">
                status: {issue.current_status || "open"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Admin Image Verification
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Suggested photos are AI matches. Verified photos require admin approval.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Selected image
                </p>

                {selectedFullImageUrl ? (
                  <img
                    src={selectedFullImageUrl}
                    alt="Selected issue image"
                    className="h-48 w-full rounded-xl border border-slate-200 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                    No selected image
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={busy || locked || !selectedImage}
                    variant="success"
                    onClick={() => adminReview("approved", "approved")}
                    title="Approves the finding and verifies the selected image."
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Approve Issue + Image
                  </Button>

                  <Button
                    disabled={busy || locked || !selectedImage}
                    variant="success"
                    onClick={() => imageVerify("verified")}
                    title="Only verifies the selected image."
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Verify Image Only
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Verified image
                </p>

                {verifiedFullImageUrl ? (
                  <img
                    src={verifiedFullImageUrl}
                    alt="Verified issue image"
                    className="h-48 w-full rounded-xl border border-emerald-200 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                    No verified image yet
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={busy || locked}
                    variant="danger"
                    onClick={() => imageVerify("mismatch")}
                  >
                    <ImageOff className="h-4 w-4" />
                    Image Mismatch
                  </Button>

                  <Button
                    disabled={busy || locked}
                    variant="warning"
                    onClick={() => adminReview("needs_review", "needs_review")}
                  >
                    <Clock className="h-4 w-4" />
                    Needs Review
                  </Button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Final baseline lock
                </p>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Final approval requires admin review to be approved. Once locked,
                  the issue should no longer be edited from the dashboard.
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={
                      busy ||
                      locked ||
                      safeText(issue.admin_review_status).toLowerCase() !== "approved"
                    }
                    variant="primary"
                    onClick={() => finalApproval("approved")}
                  >
                    <Lock className="h-4 w-4" />
                    Final Approve + Lock
                  </Button>

                  <Button
                    disabled={busy || locked}
                    variant="danger"
                    onClick={() => finalApproval("rejected")}
                  >
                    <XCircle className="h-4 w-4" />
                    Final Reject
                  </Button>
                </div>
              </div>
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
            disabled={busy || locked}
            className="mt-4 min-h-20 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Home className="h-4 w-4" />
                Homeowner actions
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy || locked}
                  variant="secondary"
                  onClick={() => homeownerReview("confirmed", "accepted")}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Confirm
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="warning"
                  onClick={() => homeownerReview("needs_repair", "accepted")}
                >
                  <Wrench className="h-4 w-4" />
                  Needs Repair
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="secondary"
                  onClick={() => homeownerReview("monitor", "accepted")}
                >
                  <Clock className="h-4 w-4" />
                  Monitor
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="success"
                  onClick={() => homeownerReview("already_fixed", "accepted")}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Already Fixed
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="secondary"
                  onClick={() => homeownerReview("not_a_concern", "accepted")}
                >
                  Not a Concern
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="danger"
                  onClick={() => homeownerReview("image_mismatch", "mismatch")}
                >
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
                <Button
                  disabled={busy || locked}
                  variant="success"
                  onClick={() => adminReview("approved", "approved")}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Approve Issue + Image
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="secondary"
                  onClick={() => adminReview("approved", "needs_review")}
                >
                  Approve Issue Only
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="success"
                  onClick={() => imageVerify("verified")}
                >
                  Verify Selected Image
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="danger"
                  onClick={() => imageVerify("mismatch")}
                >
                  Mark Image Mismatch
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="warning"
                  onClick={() => adminReview("needs_review", "needs_review")}
                >
                  Needs Review
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="danger"
                  onClick={() => adminReview("rejected", "mismatch")}
                >
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
                <Button
                  disabled={
                    busy ||
                    locked ||
                    safeText(issue.admin_review_status).toLowerCase() !== "approved"
                  }
                  variant="primary"
                  onClick={() => finalApproval("approved")}
                >
                  <Lock className="h-4 w-4" />
                  Final Approve + Lock Baseline
                </Button>
                <Button
                  disabled={busy || locked}
                  variant="danger"
                  onClick={() => finalApproval("rejected")}
                >
                  <XCircle className="h-4 w-4" />
                  Final Reject
                </Button>
                <Button disabled={busy || locked} variant="ghost" onClick={hideFromQueue}>
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
      const res = await fetch(
        `${API_BASE}/verified-issues/${encodeURIComponent(recordId)}`
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recordId = params.get("record_id");

    if (recordId) {
      setMode("record");
      setSelectedRecord(recordId);
    }
  }, []);

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
        issue.admin_image_decision,
        issue.image_match_status,
        issue.final_approval_status,
        issue.baseline_locked,
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
                Dashboard Image Review + Admin Verification Pass 2
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Review homeowner decisions, select candidate images, verify
                image matches, approve admin findings, and lock final baseline
                records.
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
