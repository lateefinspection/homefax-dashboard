import React, { useEffect, useMemo, useState } from "react";
import HomeFaxStandardFindingCard from "./HomeFaxStandardFindingCard.jsx";

const DEFAULT_RECORD_ID =
  "pdf-6039-s-carpenter-st-inspection-report-by-big-ben-inspections-by-1f8a26dc";

function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://lateef-fastapi-docker.onrender.com"
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
    monitor: "Monitoring",
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

const DECISION_PRIORITY = {
  unreviewed: 1,
  repair_needed: 2,
  needs_repair: 2,
  needs_contractor: 3,
  wrong_photo: 4,
  image_mismatch: 4,
  image_review_needed: 4,
  monitor: 5,
  monitoring: 5,
  already_repaired: 6,
  repaired: 6,
  not_an_issue: 7,
  dismissed: 7,
};

function getDecisionPriority(issue) {
  const decision = getIssueDecision(issue);
  return DECISION_PRIORITY[decision] || 99;
}

function getSeverityPriority(issue) {
  const values = [
    issue?.standard_severity,
    issue?.severity,
    issue?.priority,
    issue?.source_finding_text,
    issue?.source_finding_title,
    issue?.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (values.includes("critical") || values.includes("safety") || values.includes("hazard")) {
    return 1;
  }

  if (values.includes("major") || values.includes("high") || values.includes("leak") || values.includes("missing")) {
    return 2;
  }

  if (values.includes("minor") || values.includes("low")) {
    return 4;
  }

  return 3;
}

function parseItemNumber(value) {
  const text = String(value || "");
  const parts = text.match(/\d+/g);

  if (!parts || parts.length === 0) return 999999;

  const padded = parts
    .slice(0, 4)
    .map((part) => String(part).padStart(3, "0"))
    .join("");

  return Number(padded || 999999);
}

function compareStandardIssues(a, b) {
  const decisionDiff = getDecisionPriority(a) - getDecisionPriority(b);
  if (decisionDiff !== 0) return decisionDiff;

  const severityDiff = getSeverityPriority(a) - getSeverityPriority(b);
  if (severityDiff !== 0) return severityDiff;

  const aItem = parseItemNumber(a?.source_item_number || a?.item_number || a?.item);
  const bItem = parseItemNumber(b?.source_item_number || b?.item_number || b?.item);

  if (aItem !== bItem) return aItem - bItem;

  return String(a?.source_finding_title || a?.title || "").localeCompare(
    String(b?.source_finding_title || b?.title || "")
  );
}

function csvCell(value) {
  const text = String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `"${text.replace(/"/g, '""')}"`;
}

function makeCsvFilename(recordId, decisionFilter) {
  const safeRecord = String(recordId || "homefax")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  const safeFilter = String(decisionFilter || "all")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-");

  const date = new Date().toISOString().slice(0, 10);

  return `homefax-standard-findings-${safeFilter}-${date}-${safeRecord}.csv`;
}

function makeJsonFilename(recordId, decisionFilter) {
  const safeRecord = String(recordId || "homefax")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  const safeFilter = String(decisionFilter || "all")
    .replace(/[^a-z0-9-_]+/gi, "-")
    .replace(/-+/g, "-");

  const date = new Date().toISOString().slice(0, 10);

  return `homefax-standard-findings-${safeFilter}-${date}-${safeRecord}.json`;
}

function pickCsvValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}



function isCompletedStandardIssue(issue) {
  const baselineLocked = String(issue?.baseline_locked || "").toLowerCase();
  const finalApproval = String(issue?.final_approval_status || "").toLowerCase();
  const currentStatus = String(issue?.current_status || issue?.status || "").toLowerCase();
  const hidden = String(issue?.hidden_from_review_queue || "").toLowerCase();

  return (
    baselineLocked === "yes" ||
    baselineLocked === "true" ||
    baselineLocked === "1" ||
    baselineLocked === "locked" ||
    finalApproval === "approved" ||
    currentStatus === "closed" ||
    currentStatus === "resolved" ||
    hidden === "yes" ||
    hidden === "true" ||
    hidden === "1"
  );
}

export default function HomeFaxStandardFindingsSection() {
  const apiBaseUrl = getApiBaseUrl();
  const recordId = getRecordIdFromUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [verifiedPayload, setVerifiedPayload] = useState(null);
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [bulkExpandCommand, setBulkExpandCommand] = useState({ expanded: null, version: 0 });
  const [copyMessage, setCopyMessage] = useState("");
  const [copyText, setCopyText] = useState("");

  async function loadStandardFindings({ quiet = false } = {}) {
    if (!quiet) {
      setLoading(true);
    }

    setError("");

    try {
      const verifiedUrl = `${apiBaseUrl}/verified-issues/${encodeURIComponent(recordId)}`;
      const verifiedResponse = await fetch(verifiedUrl);

      let verifiedData = null;

      if (verifiedResponse.ok) {
        verifiedData = await verifiedResponse.json();
        setVerifiedPayload(verifiedData);
      }

      const previewUrl = `${apiBaseUrl}/records/${encodeURIComponent(
        recordId
      )}/homefax-standard-report-preview-clean-v4?limit=100`;

      try {
        const response = await fetch(previewUrl);

        if (!response.ok) {
          throw new Error(`Standard preview request failed: ${response.status}`);
        }

        const data = await response.json();
        setPayload(data);
      } catch (previewErr) {
        console.warn("Standard preview failed. Falling back to verified issues:", previewErr);

        if (verifiedData?.issues?.length) {
          setPayload({
            success: true,
            source: "verified_issues_fallback",
            record_id: recordId,
            issues: verifiedData.issues,
          });
          setError("");
        } else {
          throw previewErr;
        }
      }
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

  const verifiedIssuesById = useMemo(() => {
    const map = new Map();

    for (const issue of verifiedPayload?.issues || []) {
      if (issue?.id !== undefined && issue?.id !== null) {
        map.set(String(issue.id), issue);
      }
    }

    return map;
  }, [verifiedPayload]);

  const issues = useMemo(() => {
    const standardIssues = payload?.issues || [];

    return standardIssues.map((issue) => {
      const verified = verifiedIssuesById.get(String(issue?.id));

      if (!verified) {
        return issue;
      }

      return {
        ...issue,

        // Live workflow/admin state from /verified-issues
        homeowner_decision: verified.homeowner_decision,
        homeowner_note: verified.homeowner_note,
        homeowner_image_decision: verified.homeowner_image_decision,
        homeowner_reviewed_at: verified.homeowner_reviewed_at,

        admin_review_status: verified.admin_review_status,
        admin_image_decision: verified.admin_image_decision,
        admin_reviewed_at: verified.admin_reviewed_at,
        admin_note: verified.admin_note,

        image_match_status: verified.image_match_status,
        image_match_confidence: verified.image_match_confidence,
        needs_image_review: verified.needs_image_review,
        verified_image_url: verified.verified_image_url,

        final_approval_status: verified.final_approval_status,
        final_approved_at: verified.final_approved_at,
        final_approved_by: verified.final_approved_by,

        baseline_locked: verified.baseline_locked,
        baseline_locked_at: verified.baseline_locked_at,

        status: verified.status,
        current_status: verified.current_status,
        risk_score: verified.risk_score,
        risk_level: verified.risk_level,
        priority: verified.priority,
        updated_at: verified.updated_at,

        // Keep live images when available, but preserve standard card fallbacks
        image_url: verified.image_url || issue.image_url,
        candidate_image_urls: verified.candidate_image_urls || issue.candidate_image_urls,
      };
    });
  }, [payload, verifiedIssuesById]);

  const totalFindings = issues.length;

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (!decisionMatchesFilter(issue, decisionFilter)) {
        return false;
      }

      if (hideCompleted && isCompletedStandardIssue(issue)) {
        return false;
      }

      return true;
    });
  }, [issues, decisionFilter, hideCompleted]);

  const sortedFilteredIssues = useMemo(() => {
    return [...filteredIssues].sort(compareStandardIssues);
  }, [filteredIssues]);

  const filteredFindingsCount = sortedFilteredIssues.length;

  const countByDecision = (filter) =>
    issues.filter((issue) => decisionMatchesFilter(issue, filter)).length;

  function buildVisibleIssuesJsonPayload() {
    return {
      export_type: "homefax_standard_findings_visible_export",
      export_version: "1.0",
      exported_at: new Date().toISOString(),
      record_id: recordId,
      decision_filter: decisionFilter,
      decision_filter_label: decisionLabel(decisionFilter),
      visible_count: sortedFilteredIssues.length,
      total_findings: totalFindings,
      review_progress: {
        reviewed_count: reviewedCount,
        unreviewed_count: unreviewedCount,
        completion_percent: completionPercent,
        needs_action_count: needsActionCount,
        image_review_count: wrongPhotoCount,
        monitoring_count: monitorCount,
        closed_or_resolved_count: closedOrResolvedCount,
      },
      issues: sortedFilteredIssues.map((issue, index) => {
        const decision = getIssueDecision(issue);

        return {
          export_order: index + 1,

          id: issue.id ?? null,
          record_id: issue.record_id || recordId,

          source_item_number: pickCsvValue(
            issue.source_item_number,
            issue.item_number,
            issue.item
          ),
          source_finding_title: pickCsvValue(
            issue.source_finding_title,
            issue.title,
            issue.standard_plain_summary
          ),
          source_finding_text: pickCsvValue(issue.source_finding_text),
          source_recommendation: pickCsvValue(issue.source_recommendation),

          decision,
          decision_label: decisionLabel(decision),
          status: pickCsvValue(issue.status),
          current_status: pickCsvValue(issue.current_status),
          homeowner_decision: pickCsvValue(issue.homeowner_decision),
          homeowner_note: pickCsvValue(issue.homeowner_note),
          homeowner_reviewed_at: pickCsvValue(issue.homeowner_reviewed_at),
          hidden_from_review_queue: pickCsvValue(issue.hidden_from_review_queue),

          location: getLocation(issue),
          standard_location_area: pickCsvValue(issue.standard_location_area),
          category: pickCsvValue(issue.standard_category, issue.category),
          system: pickCsvValue(issue.standard_system, issue.system),
          component: pickCsvValue(issue.standard_component, issue.component),
          defect_type: pickCsvValue(issue.standard_defect_type, issue.defect_type),
          severity: pickCsvValue(issue.standard_severity, issue.severity),

          risk_reasons: issue.standard_risk_reasons || issue.risk_reasons || [],
          plain_summary: pickCsvValue(issue.standard_plain_summary, issue.plain_summary),
          recommended_trade: pickCsvValue(
            issue.standard_recommended_trade,
            issue.recommended_trade
          ),
          recommended_action: pickCsvValue(
            issue.standard_recommended_action,
            issue.recommended_action
          ),
          monitoring_plan: pickCsvValue(
            issue.standard_monitoring_plan,
            issue.monitoring_plan
          ),

          source_page: issue.source_page ?? "",
          source_report_section: pickCsvValue(issue.source_report_section),
          source_pdf_url: pickCsvValue(issue.source_pdf_url),
          source_pdf_page_url: pickCsvValue(issue.source_pdf_page_url),

          primary_image_url: pickCsvValue(
            issue.primary_image_url,
            issue.image_url,
            issue.verified_image_url
          ),
          candidate_image_count: issue.candidate_image_count ?? null,
          candidate_image_urls: issue.candidate_image_urls || [],

          admin_review_status: pickCsvValue(issue.admin_review_status),
          admin_image_decision: pickCsvValue(issue.admin_image_decision),
          image_match_status: pickCsvValue(issue.image_match_status),
          verified_image_url: pickCsvValue(issue.verified_image_url),
          final_approval_status: pickCsvValue(issue.final_approval_status),
          baseline_locked: pickCsvValue(issue.baseline_locked),
        };
      }),
    };
  }

  function exportVisibleIssuesJson() {
    const payload = buildVisibleIssuesJsonPayload();
    const json = JSON.stringify(payload, null, 2);

    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = makeJsonFilename(recordId, decisionFilter);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setCopyMessage(`Exported ${sortedFilteredIssues.length} visible findings as JSON.`);
    window.setTimeout(() => setCopyMessage(""), 3000);
  }

  function exportVisibleIssuesCsv() {
    const headers = [
      "Item Number",
      "Title",
      "Decision",
      "Current Status",
      "Reviewed At",
      "Homeowner Note",
      "Location",
      "Category",
      "System",
      "Component",
      "Severity",
      "Recommended Trade",
      "Recommended Action",
      "Source Page",
      "Report Section",
      "Primary Image URL",
      "Source Finding Text",
      "HomeFax Explanation",
      "Monitoring Plan",
      "Admin Review Status",
      "Admin Image Decision",
      "Image Match Status",
      "Verified Image URL",
      "Final Approval Status",
      "Baseline Locked",
    ];

    const rows = sortedFilteredIssues.map((issue) => {
      const decision = decisionLabel(getIssueDecision(issue));
      const location = getLocation(issue);

      return [
        pickCsvValue(issue.source_item_number, issue.item_number, issue.item),
        pickCsvValue(issue.source_finding_title, issue.title, issue.standard_plain_summary),
        decision,
        pickCsvValue(issue.current_status, issue.status),
        pickCsvValue(issue.homeowner_reviewed_at),
        pickCsvValue(issue.homeowner_note),
        location,
        pickCsvValue(issue.standard_category, issue.category),
        pickCsvValue(issue.standard_system, issue.system),
        pickCsvValue(issue.standard_component, issue.component),
        pickCsvValue(issue.standard_severity, issue.severity),
        pickCsvValue(issue.standard_recommended_trade, issue.recommended_trade),
        pickCsvValue(issue.standard_recommended_action, issue.recommended_action),
        pickCsvValue(issue.source_page),
        pickCsvValue(issue.source_report_section),
        pickCsvValue(issue.primary_image_url, issue.image_url, issue.verified_image_url),
        pickCsvValue(issue.source_finding_text),
        pickCsvValue(issue.standard_plain_summary, issue.plain_summary),
        pickCsvValue(issue.standard_monitoring_plan, issue.monitoring_plan),
        pickCsvValue(issue.admin_review_status),
        pickCsvValue(issue.admin_image_decision),
        pickCsvValue(issue.image_match_status),
        pickCsvValue(issue.verified_image_url),
        pickCsvValue(issue.final_approval_status),
        pickCsvValue(issue.baseline_locked),
      ];
    });

    const csv = [
      headers.map(csvCell).join(","),
      ...rows.map((row) => row.map(csvCell).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = makeCsvFilename(recordId, decisionFilter);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setCopyMessage(`Exported ${sortedFilteredIssues.length} visible findings as CSV.`);
    window.setTimeout(() => setCopyMessage(""), 3000);
  }

  async function copyVisibleIssueSummary() {
    const lines = sortedFilteredIssues.map((issue) => {
      const item = issue.source_item_number || issue.item_number || issue.item || "No item";
      const title =
        issue.source_finding_title ||
        issue.title ||
        issue.standard_plain_summary ||
        "Untitled finding";
      const decision = decisionLabel(getIssueDecision(issue));
      const location = getLocation(issue);

      return `${item} — ${title} | ${decision} | ${location}`;
    });

    const summary = [
      `HomeFax visible standard findings: ${sortedFilteredIssues.length} of ${totalFindings}`,
      `Decision filter: ${decisionLabel(decisionFilter)}`,
      "",
      ...lines,
    ].join("\n");

    setCopyText(summary);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summary);
        setCopyMessage("Copied visible issue summary.");
      } else {
        setCopyMessage("Copy box opened below. Select the text and copy it manually.");
      }
      window.setTimeout(() => setCopyMessage(""), 3500);
    } catch (err) {
      setCopyMessage("Copy box opened below. Select the text and copy it manually.");
      window.setTimeout(() => setCopyMessage(""), 3500);
    }
  }

  const reviewedCount = totalFindings - countByDecision("unreviewed");
  const unreviewedCount = countByDecision("unreviewed");
  const monitorCount = countByDecision("monitor");
  const repairNeededCount = countByDecision("repair_needed");
  const needsContractorCount = countByDecision("needs_contractor");
  const wrongPhotoCount = countByDecision("wrong_photo");
  const alreadyRepairedCount = countByDecision("already_repaired");
  const notAnIssueCount = countByDecision("not_an_issue");

  const needsActionCount = repairNeededCount + needsContractorCount;
  const closedOrResolvedCount = alreadyRepairedCount + notAnIssueCount;

  const completionPercent =
    totalFindings > 0 ? Math.round((reviewedCount / totalFindings) * 100) : 0;

  const completionStats = [
    {
      label: "Reviewed",
      value: `${reviewedCount} / ${totalFindings}`,
      helper: `${completionPercent}% complete`,
    },
    {
      label: "Unreviewed",
      value: unreviewedCount,
      helper: "still need a decision",
    },
    {
      label: "Needs Action",
      value: needsActionCount,
      helper: "repair or contractor",
    },
    {
      label: "Image Review",
      value: wrongPhotoCount,
      helper: "photo mismatch",
    },
    {
      label: "Monitoring",
      value: monitorCount,
      helper: "tracked over time",
    },
    {
      label: "Closed / Resolved",
      value: closedOrResolvedCount,
      helper: "fixed or dismissed",
    },
  ];

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
            <div className="text-sm font-black text-slate-950">Review Progress</div>
            <div className="text-xs text-slate-500">
              Track how much of this inspection has been reviewed and what needs action.
            </div>
          </div>

          <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
            {completionPercent}% complete
          </div>
        </div>

        <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {completionStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                {stat.label}
              </div>
              <div className="mt-1 text-xl font-black text-slate-950">
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-slate-500">
                {stat.helper}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky top-3 z-30 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-slate-950">Find by Review Status</div>
            <div className="text-xs text-slate-500">
              Showing {filteredFindingsCount} of {totalFindings} standard findings.
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              Use these buckets to quickly find items you are monitoring, repairing, dismissing, or still reviewing.
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

            const importantBucket =
              filter === "unreviewed" ||
              filter === "monitor" ||
              filter === "repair_needed" ||
              filter === "needs_contractor" ||
              filter === "wrong_photo";

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setDecisionFilter(filter)}
                className={
                  active
                    ? "rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm ring-4 ring-slate-200"
                    : importantBucket && count > 0
                      ? "rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
                      : "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                }
              >
                {decisionLabel(filter)}
                <span className={active ? "ml-2 text-white/80" : "ml-2 text-slate-500"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {decisionFilter !== "all" ? (
          <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            Active bucket: {decisionLabel(decisionFilter)}. Only matching findings are shown below.
          </div>
        ) : null}
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

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-black text-slate-950">Bulk Review Tools</div>
            <div className="text-xs text-slate-500">
              Visible cards: {filteredFindingsCount}. These tools only affect the cards currently shown by your filter.
            </div>
            {copyMessage ? (
              <div className="mt-2 text-xs font-bold text-emerald-700">{copyMessage}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHideCompleted((value) => !value)}
              className={
                hideCompleted
                  ? "rounded-full bg-amber-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-700"
                  : "rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
              }
            >
              {hideCompleted ? "Showing active only" : "Hide completed"}
            </button>

            <button
              type="button"
              onClick={() => setBulkExpandCommand((cmd) => ({ expanded: true, version: cmd.version + 1 }))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Open all visible
            </button>

            <button
              type="button"
              onClick={() => setBulkExpandCommand((cmd) => ({ expanded: false, version: cmd.version + 1 }))}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Collapse all visible
            </button>

            <button
              type="button"
              onClick={copyVisibleIssueSummary}
              className="rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
            >
              Copy visible summary
            </button>

            <button
              type="button"
              onClick={exportVisibleIssuesCsv}
              className="rounded-full bg-emerald-700 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-800"
            >
              Export visible CSV
            </button>

            <button
              type="button"
              onClick={exportVisibleIssuesJson}
              className="rounded-full bg-blue-700 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-800"
            >
              Export visible JSON
            </button>
          </div>
        </div>

        {copyText ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                Visible Issue Summary
              </div>
              <button
                type="button"
                onClick={() => setCopyText("")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <textarea
              readOnly
              value={copyText}
              onFocus={(event) => event.target.select()}
              className="h-56 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-800"
            />
            <div className="mt-2 text-xs text-slate-500">
              Click inside the box, press Ctrl+A, then Ctrl+C.
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5">
        {sortedFilteredIssues.map((issue) => (
          <HomeFaxStandardFindingCard
            key={issue.id || `${issue.source_item_number}-${issue.title}`}
            issue={issue}
            apiBaseUrl={apiBaseUrl}
            forcedExpanded={bulkExpandCommand}
            onRefresh={() => loadStandardFindings({ quiet: true })}
          />
        ))}
      </div>
    </section>
  );
}
