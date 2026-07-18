import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  MapPin,
  ShieldAlert,
  Wrench,
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  Eye,
  CheckCircle2,
  Hammer,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function displayCleanText(value) {
  let text = String(value || "")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/qualiíed/g, "qualified")
    .replace(/Qualiíed/g, "Qualified")
    .replace(/rooíng/g, "roofing")
    .replace(/Rooíng/g, "Roofing")
    .replace(/îashing/g, "flashing")
    .replace(/Îashing/g, "Flashing")
    .replace(/Soïts/g, "Soffits")
    .replace(/soïts/g, "soffits")
    .replace(/eïcient/g, "efficient")
    .replace(/ílled/g, "filled")
    .replace(/íller/g, "filler")
    .replace(/ínger/g, "finger")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl");

  const noise = [
    "6039 S Carpenter St",
    "Vasintino Johnson",
    "Lateef Home Inspection Services",
  ];

  for (const item of noise) {
    text = text.replaceAll(item, "");
  }

  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/g, "")
    .trim();
}

function getTitle(issue) {
  return pickFirst(
    issue.source_finding_title,
    issue.title,
    issue.defect_type,
    "Untitled Finding"
  );
}

function titleCaseLocation(value) {
  const text = cleanText(value);
  if (!text) return "";

  const lowerWords = new Set(["of", "at", "the", "and", "in", "to"]);
  return text
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      if (index > 0 && lowerWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function extractLocationFromSource(issue) {
  const source = cleanText(issue.source_finding_text).toLowerCase();
  const title = cleanText(issue.source_finding_title || issue.title).toLowerCase();
  const haystack = `${source} ${title}`;

  const knownLocations = [
    "right side of home",
    "right side of the home",
    "left side of home",
    "left side of the home",
    "front porch",
    "front of home",
    "rear of home",
    "back of home",
    "basement",
    "bathroom",
    "kitchen",
    "laundry room",
    "electrical panel",
    "electrical panel cover",
    "main water shut-off valve",
    "water heater",
    "roof penetration",
    "exterior door",
  ];

  for (const location of knownLocations) {
    if (haystack.includes(location)) {
      return titleCaseLocation(location);
    }
  }

  return "";
}

function getSystemComponent(issue) {
  const system = pickFirst(issue.system, issue.standard_system);
  const component = pickFirst(issue.component, issue.standard_component);

  if (system && component) return `${system} / ${component}`;
  if (system) return system;
  if (component) return component;

  return "";
}

function getLocation(issue) {
  const sourceLocation = extractLocationFromSource(issue);
  const systemComponent = getSystemComponent(issue);

  // Best homeowner-facing location:
  // exact location from inspector text + system/component from standard finding.
  if (sourceLocation && systemComponent) {
    return `${sourceLocation} — ${systemComponent}`;
  }

  if (sourceLocation) return sourceLocation;

  // Next best: system/component, because it is more actionable than only report section.
  if (systemComponent) return systemComponent;

  // Backend v4 source section/location is useful, but less precise.
  const backendLocation = pickFirst(
    issue.standard_location_area,
    issue.location,
    issue.area,
    issue.room,
    issue.source_report_section,
    issue.location_area,
    issue.finding_location
  );

  if (backendLocation) return backendLocation;

  const sourceText = cleanText(issue.source_finding_text);
  const itemNumber = pickFirst(issue.source_item_number);

  if (sourceText && itemNumber && sourceText.startsWith(itemNumber)) {
    const afterItem = sourceText.slice(itemNumber.length).trim();
    const words = afterItem.split(" ").slice(0, 8).join(" ");
    if (words) return words;
  }

  return "Location not specified";
}

function getSourceText(issue) {
  return pickFirst(
    issue.source_finding_text,
    issue.summary,
    "No original inspector source text available yet."
  );
}

function getHomeFaxExplanation(issue) {
  return pickFirst(
    issue.plain_summary,
    issue.standard_plain_summary,
    issue.summary,
    "No HomeFax explanation available yet."
  );
}

function getInspectorRecommendation(issue) {
  return pickFirst(
    issue.source_recommendation,
    issue.recommendation,
    ""
  );
}

function getRecommendedAction(issue) {
  return pickFirst(
    issue.recommended_action,
    issue.standard_recommended_action,
    "Review and correct as recommended by a qualified professional."
  );
}

function getRecommendedTrade(issue) {
  return pickFirst(
    issue.recommended_trade,
    issue.standard_recommended_trade,
    "Qualified professional"
  );
}

function getMonitoringPlan(issue) {
  return pickFirst(
    issue.monitoring_plan,
    issue.standard_monitoring_plan,
    "Monitor for worsening conditions, completed repairs, moisture issues, safety changes, or recurrence."
  );
}

function getRiskReasons(issue) {
  if (Array.isArray(issue.risk_reasons)) {
    return issue.risk_reasons.filter(Boolean).map((item) => cleanText(item));
  }

  if (typeof issue.risk_reasons === "string") {
    try {
      const parsed = JSON.parse(issue.risk_reasons);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((item) => cleanText(item));
      }
    } catch {
      return issue.risk_reasons
        .split(",")
        .map((item) => cleanText(item))
        .filter(Boolean);
    }
  }

  return [];
}

function getImages(issue) {
  const images = [];
  const primary = pickFirst(issue.primary_image_url, issue.image_url, issue.suggested_image_url);

  if (primary) {
    images.push({
      url: primary,
      label: "Primary Evidence",
    });
  }

  const candidates = issue.candidate_image_urls;

  if (Array.isArray(candidates)) {
    candidates.forEach((url, index) => {
      if (url && !images.some((image) => image.url === url)) {
        images.push({
          url,
          label: `Candidate ${index + 1}`,
        });
      }
    });
  }

  return images;
}

function getImageUrl(apiBaseUrl, url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${apiBaseUrl}${url}`;
}


function getAbsoluteUrl(apiBaseUrl, url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${apiBaseUrl}${url}`;
}

function Pill({ children }) {
  if (!children) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

function SectionBlock({ icon: Icon, title, children, tone = "default" }) {
  const className =
    tone === "source"
      ? "border-blue-100 bg-blue-50/70"
      : tone === "homefax"
      ? "border-emerald-100 bg-emerald-50/70"
      : tone === "action"
      ? "border-amber-100 bg-amber-50/80"
      : tone === "risk"
      ? "border-red-100 bg-red-50/70"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {title}
      </div>
      <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {children}
      </div>
    </div>
  );
}


function formatDecisionLabel(value) {
  const text = String(value || "").trim();

  if (!text || text === "unreviewed") return "";

  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return date.toLocaleString();
}

function ReviewStatePill({ label, value }) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ReviewActionButton({
  icon: Icon,
  label,
  description,
  disabled,
  active,
  onClick,
  tone = "default",
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
      : tone === "bad"
      ? "border-red-200 bg-red-50 text-red-900 hover:bg-red-100"
      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50";

  const activeClass = active ? "ring-2 ring-slate-900 ring-offset-2" : "";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-[72px] items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition ${toneClass} ${activeClass} ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0" /> : null}
      <span>
        <span className="block text-sm font-black">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 opacity-80">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}


export default function HomeFaxStandardFindingCard({ issue, apiBaseUrl, onRefresh,
  forcedExpanded,
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (
      forcedExpanded &&
      typeof forcedExpanded === "object" &&
      typeof forcedExpanded.expanded === "boolean"
    ) {
      setExpanded(forcedExpanded.expanded);
    } else if (typeof forcedExpanded === "boolean") {
      setExpanded(forcedExpanded);
    }
  }, [forcedExpanded]);

  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [localAdminReviewStatus, setLocalAdminReviewStatus] = useState(
    issue.admin_review_status || "pending"
  );
  const [localAdminImageDecision, setLocalAdminImageDecision] = useState(
    issue.admin_image_decision || "pending"
  );
  const [localImageMatchStatus, setLocalImageMatchStatus] = useState(
    issue.image_match_status || "suggested"
  );
  const [localVerifiedImageUrl, setLocalVerifiedImageUrl] = useState(
    issue.verified_image_url || ""
  );
  const [localFinalApprovalStatus, setLocalFinalApprovalStatus] = useState(
    issue.final_approval_status || "not_approved"
  );
  const [localBaselineLocked, setLocalBaselineLocked] = useState(
    issue.baseline_locked || issue.baselineLocked || "no"
  );
  const [localCurrentStatus, setLocalCurrentStatus] = useState(
    issue.current_status || issue.status || ""
  );
  const [localDecision, setLocalDecision] = useState(
    issue.homeowner_review_decision ||
      issue.homeowner_decision ||
      issue.review_decision ||
      ""
  );
  const [localDecisionNote, setLocalDecisionNote] = useState(
    issue.homeowner_review_note ||
      issue.homeowner_note ||
      issue.review_note ||
      ""
  );

  const isAdminMode =
    typeof window !== "undefined" &&
    (() => {
      const params = new URLSearchParams(window.location.search);
      const value = String(params.get("admin") || params.get("mode") || "").toLowerCase();
      return value === "1" || value === "true" || value === "admin";
    })();

  useEffect(() => {
    setLocalAdminReviewStatus(issue.admin_review_status || "pending");
    setLocalAdminImageDecision(issue.admin_image_decision || "pending");
    setLocalImageMatchStatus(issue.image_match_status || "suggested");
    setLocalVerifiedImageUrl(issue.verified_image_url || "");
    setLocalFinalApprovalStatus(issue.final_approval_status || "not_approved");
    setLocalBaselineLocked(issue.baseline_locked || issue.baselineLocked || "no");
    setLocalCurrentStatus(issue.current_status || issue.status || "");
  }, [
    issue.id,
    issue.admin_review_status,
    issue.admin_image_decision,
    issue.image_match_status,
    issue.verified_image_url,
    issue.final_approval_status,
    issue.baseline_locked,
    issue.baselineLocked,
    issue.current_status,
    issue.status,
  ]);

  const title = getTitle(issue);
  const itemNumber = pickFirst(issue.source_item_number);
  const location = getLocation(issue);
  const sourceText = displayCleanText(getSourceText(issue));
  const explanation = displayCleanText(getHomeFaxExplanation(issue));
  const inspectorRecommendation = displayCleanText(getInspectorRecommendation(issue));
  const action = displayCleanText(getRecommendedAction(issue));
  const trade = displayCleanText(getRecommendedTrade(issue));
  const monitoringPlan = displayCleanText(getMonitoringPlan(issue));

  const system = pickFirst(issue.system, issue.standard_system);
  const component = pickFirst(issue.component, issue.standard_component);
  const category = pickFirst(issue.category, issue.standard_category);
  const defectType = pickFirst(issue.defect_type, issue.standard_defect_type);
  const riskReasons = getRiskReasons(issue);
  const sourcePage = pickFirst(issue.source_page);
  const sourceReportSection = pickFirst(issue.source_report_section);
  const sourcePdfPageUrl = pickFirst(issue.source_pdf_page_url, issue.source_pdf_url);
  const sourcePdfHref = getAbsoluteUrl(apiBaseUrl, sourcePdfPageUrl);

  const savedDecision = pickFirst(localDecision, issue.homeowner_decision);
  const savedDecisionLabel = formatDecisionLabel(savedDecision);
  const reviewedAt = formatDateTime(issue.homeowner_reviewed_at);
  const savedHomeownerNote = pickFirst(localDecisionNote, issue.homeowner_note);
  const rawCurrentStatus = pickFirst(localCurrentStatus, issue.current_status, issue.status);
  const currentStatus = String(rawCurrentStatus || "").trim();

  const hasRealSavedReview =
    Boolean(savedDecisionLabel) ||
    Boolean(reviewedAt) ||
    Boolean(savedHomeownerNote);

  const displayCurrentStatus =
    hasRealSavedReview && currentStatus && currentStatus.toLowerCase() !== "open"
      ? currentStatus
      : "";

  const images = useMemo(() => getImages(issue), [issue]);

  const primaryAdminImageUrl = pickFirst(
    issue.verified_image_url,
    issue.image_url,
    images?.[0]?.url,
    ""
  );

  const baselineLocked = ["yes", "true", "1", "locked"].includes(
    String(localBaselineLocked || issue.baseline_locked || issue.baselineLocked || "").toLowerCase()
  );

  const adminReviewStatus = pickFirst(localAdminReviewStatus, issue.admin_review_status, "pending");
  const adminImageDecision = pickFirst(localAdminImageDecision, issue.admin_image_decision, "pending");
  const imageMatchStatus = pickFirst(localImageMatchStatus, issue.image_match_status, "suggested");
  const finalApprovalStatus = pickFirst(localFinalApprovalStatus, issue.final_approval_status, "not_approved");
  const verifiedImageUrl = pickFirst(localVerifiedImageUrl, issue.verified_image_url, "");

  const reviewActions = [
    {
      value: "monitor",
      label: "Monitor This",
      description: "Track this item over time.",
      icon: Eye,
      tone: "default",
    },
    {
      value: "repair_needed",
      label: "Repair Needed",
      description: "Needs correction or contractor review.",
      icon: Hammer,
      tone: "warn",
    },
    {
      value: "already_repaired",
      label: "Already Repaired",
      description: "Homeowner says this has been handled.",
      icon: CheckCircle2,
      tone: "good",
    },
    {
      value: "needs_contractor",
      label: "Needs Contractor",
      description: "Flag for professional help.",
      icon: Wrench,
      tone: "warn",
    },
    {
      value: "wrong_photo",
      label: "Wrong Photo",
      description: "Evidence photo does not match.",
      icon: ThumbsDown,
      tone: "bad",
    },
    {
      value: "not_an_issue",
      label: "Not An Issue",
      description: "Dismiss from active review.",
      icon: XCircle,
      tone: "bad",
    },
  ];

  async function submitReviewDecision(decision) {
    if (!issue?.id || reviewBusy) return;

    setReviewBusy(true);
    setReviewError("");

    try {
      const response = await fetch(`${apiBaseUrl}/verified-issue/${issue.id}/standard-review-action`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          note: localDecisionNote,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }

      setLocalDecision(decision);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setReviewError(err.message || "Could not save review decision.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function submitAdminPatch(path, payload) {
    if (!issue?.id || adminBusy) return;

    if (baselineLocked) {
      setAdminError("This issue is baseline locked and cannot be changed.");
      return;
    }

    setAdminBusy(true);
    setAdminError("");

    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      const text = await response.text();

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { message: text };
      }

      if (!response.ok || data?.success === false) {
        throw new Error(data?.detail || data?.message || text || `Request failed: ${response.status}`);
      }

      if (data?.issue) {
        setLocalAdminReviewStatus(data.issue.admin_review_status || "pending");
        setLocalAdminImageDecision(data.issue.admin_image_decision || "pending");
        setLocalImageMatchStatus(data.issue.image_match_status || "suggested");
        setLocalVerifiedImageUrl(data.issue.verified_image_url || "");
        setLocalFinalApprovalStatus(data.issue.final_approval_status || "not_approved");
        setLocalBaselineLocked(data.issue.baseline_locked || data.issue.baselineLocked || "no");
        setLocalCurrentStatus(data.issue.current_status || data.issue.status || "");
      }

      if (onRefresh) {
        await onRefresh();
      }

      return data;
    } catch (err) {
      setAdminError(err.message || "Could not save admin action.");
    } finally {
      setAdminBusy(false);
    }
  }

  async function submitAdminReview(admin_review_status, admin_image_decision = "pending") {
    await submitAdminPatch(`/verified-issue/${issue.id}/admin-review`, {
      admin_review_status,
      admin_image_decision,
      verified_image_url:
        admin_image_decision === "approved" ? primaryAdminImageUrl : "",
      admin_note: adminNote,
    });
  }

  async function submitImageVerification(image_match_status) {
    await submitAdminPatch(`/verified-issue/${issue.id}/image-verification`, {
      image_match_status,
      verified_image_url:
        image_match_status === "verified" ? primaryAdminImageUrl : "",
      admin_note: adminNote,
    });
  }

  async function submitFinalApproval(final_approval_status) {
    if (
      final_approval_status === "approved" &&
      String(adminReviewStatus || "").toLowerCase() !== "approved"
    ) {
      setAdminError("Admin review must be approved before final approval.");
      return;
    }

    await submitAdminPatch(`/verified-issue/${issue.id}/final-approval`, {
      final_approval_status,
      baseline_locked: final_approval_status === "approved" ? "yes" : "no",
      final_approved_by: "dashboard-admin",
      admin_note: adminNote,
    });
  }

  async function submitHideFromQueue() {
    await submitAdminPatch(`/verified-issue/${issue.id}/hide-from-review-queue`, {
      hidden_from_review_queue: "yes",
      cleanup_reason: "manual_dashboard_hide",
      reason: "hidden_from_standard_finding_admin_panel",
      admin_note: adminNote || "Hidden from standard finding admin panel.",
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              {itemNumber ? <Pill>Item {itemNumber}</Pill> : null}
              {category ? <Pill>{category}</Pill> : null}
              {defectType ? <Pill>{defectType}</Pill> : null}
              {issue.candidate_image_count ? (
                <Pill>{issue.candidate_image_count} Image Candidates</Pill>
              ) : null}
            </div>

            <h3 className="text-xl font-black text-slate-950">
              {displayCleanText(title)}
            </h3>

            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-900">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="uppercase tracking-wide text-red-700">
                  Location / Area:
                </span>{" "}
                {displayCleanText(location)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? (
              <>
                Less <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Details <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <SectionBlock icon={FileText} title="Original Inspector Finding" tone="source">
          {sourceText}
        </SectionBlock>

        {inspectorRecommendation ? (
          <SectionBlock icon={ClipboardList} title="Inspector Recommendation" tone="source">
            {inspectorRecommendation}
          </SectionBlock>
        ) : null}

        <SectionBlock icon={ShieldAlert} title="HomeFax Explanation" tone="homefax">
          {explanation}
        </SectionBlock>

        <div className="grid gap-4 md:grid-cols-2">
          <SectionBlock icon={Wrench} title="HomeFax Recommended Action" tone="action">
            {action}
          </SectionBlock>

          <SectionBlock icon={ClipboardCheck} title="Who Should Review This">
            {trade}
          </SectionBlock>
        </div>

        {riskReasons.length ? (
          <SectionBlock icon={AlertTriangle} title="Risk Reasons" tone="risk">
            <ul className="list-disc space-y-1 pl-5">
              {riskReasons.map((reason, index) => (
                <li key={`${reason}-${index}`}>{displayCleanText(reason)}</li>
              ))}
            </ul>
          </SectionBlock>
        ) : null}

        <SectionBlock icon={Activity} title="Monitoring Plan">
          {monitoringPlan}
        </SectionBlock>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">
                Review Action
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                Choose what should happen next for this finding.
              </div>
            </div>

            {savedDecisionLabel ? (
              <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white shadow-sm">
                Saved: {savedDecisionLabel}
              </span>
            ) : null}
          </div>

          {hasRealSavedReview ? (
            <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-black text-emerald-950">
                  Saved Review State
                </div>
                {savedDecisionLabel ? (
                  <div className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white">
                    {savedDecisionLabel}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ReviewStatePill label="Saved Decision" value={savedDecisionLabel} />
                <ReviewStatePill label="Current Status" value={displayCurrentStatus} />
                <ReviewStatePill label="Reviewed At" value={reviewedAt} />
              </div>

              {savedHomeownerNote ? (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-white px-3 py-2">
                  <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Homeowner Note
                  </div>
                  <div className="mt-1 text-sm text-slate-800">
                    {savedHomeownerNote}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {baselineLocked ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950">
              <div className="text-sm font-black">
                Homeowner review is locked.
              </div>
              <div className="mt-1 text-xs font-semibold leading-5">
                This finding has been final approved and locked into the verified baseline. Review actions and notes cannot be changed from this card.
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {reviewActions.map((actionItem) => (
                  <ReviewActionButton
                    key={actionItem.value}
                    icon={actionItem.icon}
                    label={actionItem.label}
                    description={actionItem.description}
                    tone={actionItem.tone}
                    disabled={reviewBusy}
                    active={localDecision === actionItem.value}
                    onClick={() => submitReviewDecision(actionItem.value)}
                  />
                ))}
              </div>

              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Optional note
                </label>
                <textarea
                  value={localDecisionNote}
                  onChange={(event) => setLocalDecisionNote(event.target.value)}
                  rows={2}
                  placeholder="Add a note for this decision..."
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </>
          )}

          {isAdminMode ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-black">Admin Controls</div>
                  <div className="mt-1 text-xs font-semibold text-slate-300">
                    Review, verify image support, final approve, or hide this finding from the active queue.
                  </div>
                </div>

                {baselineLocked ? (
                  <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-emerald-950">
                    Baseline Locked
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-black text-slate-200">
                    Admin Mode
                  </span>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <ReviewStatePill label="Admin Review" value={adminReviewStatus} />
                <ReviewStatePill label="Image Decision" value={adminImageDecision} />
                <ReviewStatePill label="Image Match" value={imageMatchStatus} />
                <ReviewStatePill label="Final Status" value={finalApprovalStatus} />
              </div>

              <div className="mt-3 rounded-2xl bg-white/10 p-3 text-xs font-semibold text-slate-200">
                Primary admin image: {primaryAdminImageUrl || "No image available yet"}
              </div>

              {verifiedImageUrl ? (
                <div className="mt-2 rounded-2xl bg-emerald-400/20 p-3 text-xs font-bold text-emerald-100">
                  Verified image saved: {verifiedImageUrl}
                </div>
              ) : null}

              {baselineLocked ? (
                <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950">
                  <div className="text-sm font-black">
                    This issue is baseline locked.
                  </div>
                  <div className="mt-1 text-xs font-semibold leading-5">
                    Admin actions are hidden because this finding has already been final approved and locked into the verified baseline.
                  </div>
                </div>
              ) : null}

              <div className={baselineLocked ? "hidden" : "mt-4 grid gap-3 lg:grid-cols-3"}>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-300">
                    Admin Review
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={() => submitAdminReview("approved", "pending")}
                      className="rounded-full bg-emerald-400 px-3 py-2 text-xs font-black text-emerald-950 disabled:opacity-50"
                    >
                      Approve Issue
                    </button>
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={() => submitAdminReview("needs_review", "needs_review")}
                      className="rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-amber-950 disabled:opacity-50"
                    >
                      Needs Review
                    </button>
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={() => submitAdminReview("rejected", "mismatch")}
                      className="rounded-full bg-red-400 px-3 py-2 text-xs font-black text-red-950 disabled:opacity-50"
                    >
                      Reject Issue
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-300">
                    Image Review
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked || !primaryAdminImageUrl}
                      onClick={() => submitImageVerification("verified")}
                      className="rounded-full bg-emerald-400 px-3 py-2 text-xs font-black text-emerald-950 disabled:opacity-50"
                    >
                      Verify Primary Image
                    </button>
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={() => submitImageVerification("mismatch")}
                      className="rounded-full bg-red-400 px-3 py-2 text-xs font-black text-red-950 disabled:opacity-50"
                    >
                      Wrong Photo
                    </button>
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={() => submitImageVerification("needs_review")}
                      className="rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-amber-950 disabled:opacity-50"
                    >
                      Needs Image Review
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-300">
                    Final / Queue
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={
                        adminBusy ||
                        baselineLocked ||
                        String(adminReviewStatus || "").toLowerCase() !== "approved"
                      }
                      onClick={() => submitFinalApproval("approved")}
                      className="rounded-full bg-blue-300 px-3 py-2 text-xs font-black text-blue-950 disabled:opacity-50"
                    >
                      Final Approve + Lock
                    </button>
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={() => submitFinalApproval("rejected")}
                      className="rounded-full bg-red-400 px-3 py-2 text-xs font-black text-red-950 disabled:opacity-50"
                    >
                      Final Reject
                    </button>
                    <button
                      type="button"
                      disabled={adminBusy || baselineLocked}
                      onClick={submitHideFromQueue}
                      className="rounded-full bg-slate-200 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"
                    >
                      Hide From Queue
                    </button>
                  </div>
                </div>
              </div>

              <div className={baselineLocked ? "hidden" : "mt-4"}>
                <label className="text-xs font-black uppercase tracking-wide text-slate-300">
                  Admin note
                </label>
                <textarea
                  value={adminNote}
                  onChange={(event) => setAdminNote(event.target.value)}
                  rows={2}
                  placeholder="Add an admin note for this action..."
                  disabled={adminBusy || baselineLocked}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50"
                />
              </div>

              {adminError ? (
                <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                  {adminError}
                </div>
              ) : null}

              {adminBusy ? (
                <div className="mt-3 text-sm font-semibold text-slate-300">
                  Saving admin action...
                </div>
              ) : null}
            </div>
          ) : null}

          {reviewError ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {reviewError}
            </div>
          ) : null}

          {reviewBusy ? (
            <div className="mt-3 text-sm font-semibold text-slate-500">
              Saving review decision...
            </div>
          ) : null}
        </div>

        {expanded ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-bold text-slate-900">
                Source Details
              </div>

              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Item Number
                  </div>
                  <div>{itemNumber || "Not available"}</div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Source Page
                  </div>
                  <div>{sourcePage || "Not available"}</div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Report Section
                  </div>
                  <div>{sourceReportSection || "Not available"}</div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Category
                  </div>
                  <div>{category || "Not available"}</div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    System
                  </div>
                  <div>{system || "Not available"}</div>
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Component
                  </div>
                  <div>{component || "Not available"}</div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Finding Location
                  </div>
                  <div>{displayCleanText(location)}</div>
                </div>

                {sourcePdfHref ? (
                  <div className="md:col-span-4">
                    <a
                      href={sourcePdfHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {sourcePage ? `Open Original Report — Page ${sourcePage}` : "Open Original Report"}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <Camera className="h-4 w-4" />
                Evidence Photos
              </div>

              {images.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {images.slice(0, 6).map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                    >
                      <img
                        src={getImageUrl(apiBaseUrl, image.url)}
                        alt={`${title} evidence ${index + 1}`}
                        className="h-48 w-full object-cover"
                      />
                      <div className="p-2 text-xs font-bold text-slate-600">
                        {image.label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  No evidence photos attached yet.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
