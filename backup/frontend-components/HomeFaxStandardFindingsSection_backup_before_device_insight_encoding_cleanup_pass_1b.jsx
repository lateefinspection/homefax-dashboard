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


// Dashboard Monitoring Capabilities Display Pass 2B
function parseMonitoringRules(rawRules) {
  if (!rawRules) return null;

  if (typeof rawRules === "object") {
    return rawRules;
  }

  if (typeof rawRules === "string") {
    try {
      return JSON.parse(rawRules);
    } catch {
      return null;
    }
  }

  return null;
}

function formatMonitoringLabel(value) {
  if (!value) return "Not set";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeCapabilityList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function MonitoringRuleGroup({ label, items }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!safeItems.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {safeItems.map((item) => (
          <span
            key={`${label}-${item}`}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
          >
            {formatMonitoringLabel(item)}
          </span>
        ))}
      </div>
    </div>
  );
}

function MonitoringPlanIntelligenceCard({ plan }) {
  if (!plan) return null;

  const capabilities = normalizeCapabilityList(plan.allowed_capabilities);
  const rules = parseMonitoringRules(plan.monitoring_rules);
  const postRepairMonitoring = ["yes", "true", "1"].includes(
    String(plan.post_repair_monitoring_required || "").toLowerCase()
  );

  return (
    <div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-blue-950">
            Monitoring Intelligence
          </div>
          <div className="mt-1 text-xs font-semibold leading-5 text-blue-900">
            HomeFax matched this issue to monitoring capabilities, trigger rules, and post-repair watch settings.
          </div>
        </div>

        <div className="rounded-full bg-blue-700 px-3 py-1 text-xs font-black text-white">
          {formatMonitoringLabel(plan.risk_type)}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            Trigger
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {formatMonitoringLabel(plan.monitoring_trigger || rules?.trigger_group)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            Plan Status
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {formatMonitoringLabel(plan.status || plan.plan_status)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            Post-Repair Watch
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            {postRepairMonitoring ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {capabilities.length ? (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-white p-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
            Allowed Capabilities
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-900"
              >
                {formatMonitoringLabel(capability)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {rules ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MonitoringRuleGroup label="Weather Rules" items={rules.weather_triggers} />
          <MonitoringRuleGroup label="Device Rules" items={rules.device_triggers} />
          <MonitoringRuleGroup label="Manual Rules" items={rules.manual_triggers} />
        </div>
      ) : null}
    </div>
  );
}


// Monitoring Plan Expandable Evidence Drawer Pass 1
function getAbsoluteImageUrl(apiBaseUrl, value) {
  if (!value) return "";

  const url = String(value).trim();

  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${apiBaseUrl}${url}`;

  return `${apiBaseUrl}/${url}`;
}

function pickMonitoringIssueField(issue, ...keys) {
  if (!issue) return "";

  for (const key of keys) {
    const value = issue?.[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function getIssueTitleForMonitoring(issue, plan) {
  return (
    issue?.title ||
    issue?.source_finding_title ||
    issue?.summary ||
    `Issue #${plan?.source_issue_id || plan?.issue_id || plan?.id || "Unknown"}`
  );
}

function MonitoringEvidenceImageCard({
  label,
  imageUrl,
  apiBaseUrl,
  note,
  emptyText = "No image saved yet.",
}) {
  const absoluteUrl = getAbsoluteImageUrl(apiBaseUrl, imageUrl);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      {note ? (
        <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          {note}
        </div>
      ) : null}

      {absoluteUrl ? (
        <div className="mt-3">
          <img
            src={absoluteUrl}
            alt={label}
            className="h-40 w-full rounded-xl border border-slate-200 object-cover"
            loading="lazy"
          />

          <a
            href={absoluteUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-xs font-black text-blue-700 hover:text-blue-900"
          >
            Open actual image
          </a>

          <div className="mt-1 break-all text-[11px] font-semibold text-slate-500">
            {String(imageUrl)}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function MonitoringPlanEvidenceDrawer({
  plan,
  issue,
  events = [],
  apiBaseUrl,
}) {
  const title = getIssueTitleForMonitoring(issue, plan);

  const location = pickMonitoringIssueField(
    issue,
    "location",
    "standard_location",
    "source_location",
    "area",
    "room"
  );

  const sourceText = pickMonitoringIssueField(
    issue,
    "source_text",
    "original_finding",
    "inspector_finding",
    "summary",
    "description"
  );

  const explanation = pickMonitoringIssueField(
    issue,
    "explanation",
    "homefax_explanation",
    "ai_explanation"
  );

  const recommendedAction = pickMonitoringIssueField(
    issue,
    "recommended_action",
    "action",
    "inspector_recommendation",
    "recommendation"
  );

  const homeownerSelectedImageUrl = pickMonitoringIssueField(
    issue,
    "homeowner_selected_image_url",
    "homeowner_selected_image",
    "selected_homeowner_image_url"
  );

  const homeownerSelectedImageNote = pickMonitoringIssueField(
    issue,
    "homeowner_selected_image_note",
    "homeowner_image_note"
  );

  const primaryAdminImageUrl = pickMonitoringIssueField(
    issue,
    "image_url",
    "primary_image_url",
    "candidate_image_url"
  );

  const verifiedImageUrl = pickMonitoringIssueField(
    issue,
    "verified_image_url",
    "final_verified_image_url"
  );

  return (
    <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-black text-slate-950">
            Monitoring Record
          </div>
          <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            Source finding, evidence chain, and related monitoring events for this active plan.
          </div>
        </div>

        <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
          Issue #{plan?.source_issue_id || plan?.issue_id || "Unknown"}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
          Source Finding
        </div>

        <div className="mt-1 text-base font-black text-slate-950">
          {title}
        </div>

        {location ? (
          <div className="mt-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-900">
            Location / Area: {location}
          </div>
        ) : null}

        {sourceText ? (
          <div className="mt-3">
            <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              Original Inspector Finding
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-700">
              {sourceText}
            </div>
          </div>
        ) : null}

        {explanation ? (
          <div className="mt-3">
            <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              HomeFax Explanation
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-700">
              {explanation}
            </div>
          </div>
        ) : null}

        {recommendedAction ? (
          <div className="mt-3">
            <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
              Recommended Action
            </div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-700">
              {recommendedAction}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="text-sm font-black text-slate-950">
          Evidence Chain
        </div>
        <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">
          Compare homeowner-selected evidence, the current admin primary image, and the saved verified baseline image.
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-3">
          <MonitoringEvidenceImageCard
            label="Homeowner Selected Image"
            imageUrl={homeownerSelectedImageUrl}
            apiBaseUrl={apiBaseUrl}
            note={
              homeownerSelectedImageNote ||
              "Image selected by the homeowner for admin comparison."
            }
            emptyText="No homeowner-selected image is saved for this monitoring plan yet."
          />

          <MonitoringEvidenceImageCard
            label="Primary Admin Image"
            imageUrl={primaryAdminImageUrl}
            apiBaseUrl={apiBaseUrl}
            note="Current primary evidence image associated with this finding."
            emptyText="No primary admin image is available for this monitoring plan yet."
          />

          <MonitoringEvidenceImageCard
            label="Verified Baseline Image"
            imageUrl={verifiedImageUrl}
            apiBaseUrl={apiBaseUrl}
            note="Image saved as verified baseline evidence after admin approval."
            emptyText="No verified baseline image is saved for this monitoring plan yet."
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-black text-slate-950">
          Related Monitoring Events
        </div>

        {events.length ? (
          <div className="mt-3 space-y-3">
            {events.map((event) => (
              <div
                key={event.id || `${event.provider}-${event.occurred_at}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="text-sm font-black text-slate-900">
                  {event.title || event.event_title || event.provider || "Monitoring event"}
                </div>

                <div className="mt-1 text-xs font-bold text-slate-600">
                  {event.capability || "Capability not set"} · {event.severity || "severity not set"} · {event.event_status || "status not set"}
                </div>

                {event.description ? (
                  <div className="mt-2 text-xs font-semibold leading-5 text-slate-700">
                    {event.description}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
                  {event.device_name ? <span>Device: {event.device_name}</span> : null}
                  {event.occurred_at ? <span>Occurred: {event.occurred_at}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500">
            No monitoring events are attached to this plan yet.
          </div>
        )}
      </div>
    </div>
  );
}


// Homeowner Device Event Insight Dashboard Pass 1

// Homeowner Live Monitoring Description Polish Pass 1
// Homeowner Device Insight UX Polish Pass 1
function cleanHomeFaxDisplayText(value) {
  return String(value || "")
    .replaceAll("Shut-Off", "Shut-Off")
    .replaceAll("Shut-Off", "Shut-Off")
    .replaceAll("Shut Oì", "Shut-Off")
    .replaceAll("Main Water Shut-Off Valve", "Main Water Shut-Off Valve");
}

function isWeatherInsight(event) {
  const provider = String(event?.provider || "").toLowerCase();
  const sourceType = String(event?.source_type || "").toLowerCase();
  const capability = String(event?.capability || "").toUpperCase();

  return (
    provider === "weather" ||
    sourceType === "weather_event" ||
    capability.startsWith("WEATHER_") ||
    capability === "HUMIDITY"
  );
}

function getInsightSourceLabel(event) {
  if (isWeatherInsight(event)) return "Weather Alert";
  return "Device Alert";
}

function getInsightReviewButtonLabel(event) {
  return isWeatherInsight(event) ? "I reviewed this weather alert." : "I reviewed this alert.";
}

function getInsightSectionTitle() {
  return "HomeFax Live Monitoring";
}

function getInsightSectionSubtitle() {
  return "Live Alerts & HomeFax Insights";
}


// Homeowner Monitoring Insight Grouping Pass 1
function getMonitoringInsightGroupKey(event) {
  const homeownerStatus = String(event?.homeowner_confirmation_status || "").toLowerCase();
  const lifecycleStatus = String(event?.event_lifecycle_status || event?.event_status || "").toLowerCase();
  const alertStatus = String(event?.alert_status || "").toLowerCase();
  const severity = String(event?.severity || "").toLowerCase();

  if (["handled", "confirmed", "acknowledged_by_homeowner"].includes(homeownerStatus)) {
    return "handled";
  }

  if (["handled", "confirmed", "acknowledged_by_homeowner", "resolved"].includes(lifecycleStatus)) {
    return "handled";
  }

  if (["not_relevant", "dismissed"].includes(homeownerStatus)) {
    return "not_relevant";
  }

  if (homeownerStatus === "not_required" || alertStatus === "not_sent") {
    return "informational";
  }

  if (
    ["high", "critical", "urgent"].includes(severity) ||
    ["pending", "still_happening"].includes(homeownerStatus) ||
    alertStatus === "ready"
  ) {
    return "needs_attention";
  }

  return "informational";
}

function getMonitoringInsightGroupMeta(groupKey) {
  const groups = {
    needs_attention: {
      title: "Needs Attention",
      description: "Review these alerts first. They may need homeowner confirmation, inspection, or follow-up.",
    },
    informational: {
      title: "Informational",
      description: "Useful context from HomeFax monitoring that does not currently require immediate action.",
    },
    handled: {
      title: "Handled / Confirmed",
      description: "Alerts already checked, confirmed, acknowledged, or resolved by the homeowner.",
    },
    not_relevant: {
      title: "Not Relevant",
      description: "Alerts marked as not applicable to this home or situation.",
    },
  };

  return groups[groupKey] || groups.informational;
}

function groupMonitoringInsights(events) {
  const grouped = {
    needs_attention: [],
    informational: [],
    handled: [],
    not_relevant: [],
  };

  for (const event of events || []) {
    const key = getMonitoringInsightGroupKey(event);

    if (!grouped[key]) {
      grouped.informational.push(event);
      continue;
    }

    grouped[key].push(event);
  }

  return grouped;
}

function getMonitoringInsightGroupOrder() {
  return ["needs_attention", "informational", "handled", "not_relevant"];
}


function isInsightNeedsAttention(event) {
  const severity = String(event?.severity || "").toLowerCase();
  const homeownerStatus = String(event?.homeowner_confirmation_status || "").toLowerCase();
  const alertStatus = String(event?.alert_status || "").toLowerCase();

  return (
    ["high", "critical", "urgent"].includes(severity) ||
    ["pending", "still_happening"].includes(homeownerStatus) ||
    alertStatus === "ready"
  );
}


function formatDeviceInsightLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeDeviceInsightList(value) {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getDeviceInsightTone(event) {
  const severity = String(event?.severity || "").toLowerCase();
  const status = String(event?.homeowner_confirmation_status || "").toLowerCase();

  if (status === "handled") return "handled";
  if (status === "not_relevant" || status === "denied") return "muted";
  if (severity === "critical" || severity === "high") return "urgent";
  if (severity === "medium") return "warning";

  return "default";
}

function DeviceInsightPill({ children, tone = "default" }) {
  const toneClass =
    tone === "urgent"
      ? "bg-red-100 text-red-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : tone === "good"
          ? "bg-emerald-100 text-emerald-800"
          : tone === "muted"
            ? "bg-slate-100 text-slate-600"
            : "bg-blue-100 text-blue-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

// Device Insight Encoding Cleanup Pass 1
function HomeownerDeviceInsightCard({ event, apiBaseUrl, onRefresh }) {
  const [note, setNote] = useState(event?.homeowner_note || "");
  const [busyStatus, setBusyStatus] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const tone = getDeviceInsightTone(event);
  const relatedIssueIds = normalizeDeviceInsightList(event?.matched_issue_ids_json);
  const matchConfidence =
    event?.match_confidence === null || event?.match_confidence === undefined
      ? null
      : Number(event.match_confidence);

  const insightTitle = cleanHomeFaxDisplayText(
    event?.compiled_insight_title ||
      event?.title ||
      "HomeFax device insight"
  );

  const insightSummary = cleanHomeFaxDisplayText(
    event?.compiled_insight_summary ||
      event?.summary ||
      "HomeFax received this device event and added it to your home record."
  );

  const recommendedAction = cleanHomeFaxDisplayText(
    event?.recommended_homeowner_action ||
      "Review this event and confirm whether it is relevant to your home."
  );

  const providerLabel = cleanHomeFaxDisplayText(event?.provider || "HomeFax");
  const deviceLabel = cleanHomeFaxDisplayText(
    event?.device_name ||
      event?.connection_label ||
      event?.provider_label ||
      event?.provider ||
      "HomeFax source"
  );
  const relatedSystemLabel = cleanHomeFaxDisplayText(
    event?.system ||
      event?.related_system ||
      event?.matched_system ||
      "Unknown"
  );
  const matchReasonLabel = cleanHomeFaxDisplayText(
    event?.match_reason || "No match reason saved yet."
  );
  const homeownerNoteLabel = cleanHomeFaxDisplayText(
    event?.homeowner_note || event?.note || ""
  );

  async function saveHomeownerConfirmation(nextStatus) {
    if (!event?.id) {
      setError("Missing device event id.");
      return;
    }

    setBusyStatus(nextStatus);
    setError("");
    setSavedMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/device-event/${event.id}/homeowner-confirmation`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeowner_confirmation_status: nextStatus,
          homeowner_acknowledged: "yes",
          homeowner_note: note,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.detail?.message ||
          data?.detail?.error ||
          data?.message ||
          `Could not save confirmation. Status ${response.status}.`;
        throw new Error(message);
      }

      setSavedMessage("Device insight updated.");
      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (err) {
      setError(err?.message || "Could not save device insight confirmation.");
    } finally {
      setBusyStatus("");
    }
  }

  const actionButtons = [
    {
      status: "confirmed",
      label: "I Checked This",
      description: "I reviewed this alert.",
    },
    {
      status: "still_happening",
      label: "Still Happening",
      description: "This condition is still active.",
    },
    {
      status: "handled",
      label: "Mark Handled",
      description: "I handled or resolved this.",
    },
    {
      status: "not_relevant",
      label: "Not Relevant",
      description: "This does not apply to my home.",
    },
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            HomeFax Compiled Insight
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {insightTitle}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <DeviceInsightPill tone={tone}>
            {formatDeviceInsightLabel(event?.severity || "info")}
          </DeviceInsightPill>

          <DeviceInsightPill tone="default">
            {formatDeviceInsightLabel(event?.capability || "device event")}
          </DeviceInsightPill>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        {insightSummary}
      </p>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Recommended Next Step
        </p>
        <p className="mt-1 text-sm leading-6 text-blue-900">
          {recommendedAction}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Provider
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDeviceInsightLabel(event?.provider || "unknown")}
          </p>
          {event?.device_name ? (
            <p className="mt-1 text-xs text-slate-500">{event.device_name}</p>
          ) : null}
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Related System
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {event?.system || "Home system"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Match
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDeviceInsightLabel(event?.match_status || "unmatched")}
          </p>
          {matchConfidence !== null && !Number.isNaN(matchConfidence) ? (
            <p className="mt-1 text-xs text-slate-500">
              Confidence: {Math.round(matchConfidence * 100)}%
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Homeowner Status
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDeviceInsightLabel(event?.homeowner_confirmation_status || "pending")}
          </p>
          {event?.event_lifecycle_status ? (
            <p className="mt-1 text-xs text-slate-500">
              {formatDeviceInsightLabel(event.event_lifecycle_status)}
            </p>
          ) : null}
        </div>
      </div>

      {relatedIssueIds.length ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Related HomeFax Finding IDs
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {relatedIssueIds.join(", ")}
          </p>
        </div>
      ) : null}

      {event?.match_reason ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            HomeFax Match Reason
          </p>
          <p className="mt-1 text-sm text-slate-700">{event.match_reason}</p>
        </div>
      ) : null}

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Homeowner Note
        </span>
        <textarea
          value={note}
          onChange={(eventChange) => setNote(eventChange.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          placeholder="Add what you checked, saw, or did."
        />
      </label>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {actionButtons.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={Boolean(busyStatus)}
            onClick={() => saveHomeownerConfirmation(action.status)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              event?.homeowner_confirmation_status === action.status
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white"
            } ${busyStatus ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <span className="block text-sm font-semibold">
              {busyStatus === action.status ? "Saving..." : action.label}
            </span>
            <span className={`mt-1 block text-xs ${
              event?.homeowner_confirmation_status === action.status
                ? "text-slate-200"
                : "text-slate-500"
            }`}>
              {action.description}
            </span>
          </button>
        ))}
      </div>

      {savedMessage || error ? (
        <div className="mt-4">
          {savedMessage ? (
            <p className="text-sm font-semibold text-emerald-700">{savedMessage}</p>
          ) : null}

          {error ? (
            <p className="text-sm font-semibold text-red-700">{error}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}


// Homeowner Device Connection Dashboard Pass 1
function formatConnectionDate(value) {
  if (!value) return "Not synced yet";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  } catch {
    return String(value);
  }
}

function getConnectionTone(connection) {
  const status = String(connection?.connection_status || "").toLowerCase();
  const health = String(connection?.health_status || "").toLowerCase();

  if (status === "connected" && health === "healthy") return "good";
  if (status === "pending" || health === "syncing") return "default";
  if (status === "needs_reauth" || health === "warning" || health === "stale") return "warning";
  if (status === "error" || health === "error" || status === "disconnected") return "urgent";
  if (status === "disabled") return "muted";

  return "default";
}

function DeviceConnectionCard({ connection }) {
  const capabilities = Array.isArray(connection?.capabilities)
    ? connection.capabilities
    : normalizeDeviceInsightList(connection?.capabilities_json);

  const tone = getConnectionTone(connection);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Connected Source
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {connection?.connection_label || formatDeviceInsightLabel(connection?.provider || "Device Source")}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Provider: {formatDeviceInsightLabel(connection?.provider || "unknown")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DeviceInsightPill tone={tone}>
            {formatDeviceInsightLabel(connection?.connection_status || "unknown")}
          </DeviceInsightPill>
          <DeviceInsightPill tone={tone}>
            {formatDeviceInsightLabel(connection?.health_status || "unknown")}
          </DeviceInsightPill>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Devices
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {connection?.device_count ?? 0}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last Sync
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatConnectionDate(connection?.last_sync_at)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Last Event
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatConnectionDate(connection?.last_event_at)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Account / Source ID
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
            {connection?.provider_account_id || "Not specified"}
          </p>
        </div>
      </div>

      {capabilities.length ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Capabilities
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {formatDeviceInsightLabel(capability)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {connection?.notes ? (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Connection Notes
          </p>
          <p className="mt-1 text-sm text-slate-700">{connection.notes}</p>
        </div>
      ) : null}
    </article>
  );
}

function HomeownerDeviceConnectionsSection({ apiBaseUrl, recordId }) {
  const [connections, setConnections] = useState([]);
  const [capabilityCounts, setCapabilityCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function loadDeviceConnections() {
    if (!recordId || !apiBaseUrl) return;

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${apiBaseUrl}/device-connections/${recordId}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.detail?.message ||
          data?.detail?.error ||
          data?.message ||
          `Device connections failed with status ${response.status}.`;
        throw new Error(message);
      }

      setConnections(Array.isArray(data?.connections) ? data.connections : []);
      setCapabilityCounts(data?.capability_counts || {});
    } catch (err) {
      setLoadError(err?.message || "Could not load connected home sources.");
      setConnections([]);
      setCapabilityCounts({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeviceConnections();
  }, [apiBaseUrl, recordId]);

  const connectedCount = connections.filter((connection) => {
    return String(connection?.connection_status || "").toLowerCase() === "connected";
  }).length;

  const warningCount = connections.filter((connection) => {
    const status = String(connection?.connection_status || "").toLowerCase();
    const health = String(connection?.health_status || "").toLowerCase();
    return ["needs_reauth", "error", "disconnected"].includes(status) ||
      ["warning", "error", "stale"].includes(health);
  }).length;

  const capabilityEntries = Object.entries(capabilityCounts || {}).sort((a, b) => {
    return String(a[0]).localeCompare(String(b[0]));
  });

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Connected Home Sources
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Device & Weather Connections
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            These are the connected sources HomeFax can use to compile homeowner insights.
            Normal device and weather alerts are interpreted automatically by HomeFax.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DeviceInsightPill tone="default">
            {connections.length} Sources
          </DeviceInsightPill>
          <DeviceInsightPill tone={connectedCount ? "good" : "muted"}>
            {connectedCount} Connected
          </DeviceInsightPill>
          {warningCount ? (
            <DeviceInsightPill tone="warning">
              {warningCount} Needs Attention
            </DeviceInsightPill>
          ) : (
            <DeviceInsightPill tone="good">
              Healthy
            </DeviceInsightPill>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading connected home sources...
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      {!loading && !loadError && connections.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          No connected home sources are registered yet.
        </div>
      ) : null}

      {capabilityEntries.length ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available Monitoring Capabilities
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {capabilityEntries.map(([capability, count]) => (
              <span
                key={capability}
                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"
              >
                {formatDeviceInsightLabel(capability)} · {count}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {connections.length ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {connections.map((connection) => (
            <DeviceConnectionCard
              key={connection?.id || `${connection?.provider}-${connection?.provider_account_id}`}
              connection={connection}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}


function HomeownerDeviceEventInsightsSection({ apiBaseUrl, recordId }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function loadDeviceInsights() {
    if (!recordId || !apiBaseUrl) return;

    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch(`${apiBaseUrl}/device-events/${recordId}/insights`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          data?.detail?.message ||
          data?.detail?.error ||
          data?.message ||
          `Device insights failed with status ${response.status}.`;
        throw new Error(message);
      }

      setInsights(Array.isArray(data?.insights) ? data.insights : []);
    } catch (err) {
      setLoadError(err?.message || "Could not load device insights.");
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeviceInsights();
  }, [apiBaseUrl, recordId]);

  const activeInsights = insights.filter((event) => {
    const status = String(event?.homeowner_confirmation_status || "").toLowerCase();
    return !["handled", "not_relevant", "denied"].includes(status);
  });

  const archivedInsights = insights.filter((event) => {
    const status = String(event?.homeowner_confirmation_status || "").toLowerCase();
    return ["handled", "not_relevant", "denied"].includes(status);
  });

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            HomeFax Live Monitoring
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Live Alerts & HomeFax Insights
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            HomeFax compiles connected device, weather, and sensor activity into
            simple homeowner-ready insight cards. Admin review is not required for normal device telemetry.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <DeviceInsightPill tone="default">
            {insights.length} Total
          </DeviceInsightPill>
          <DeviceInsightPill tone={activeInsights.length ? "urgent" : "good"}>
            {activeInsights.length} Active
          </DeviceInsightPill>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          Loading device insights...
        </div>
      ) : null}

      {loadError ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {loadError}
        </div>
      ) : null}

      {!loading && !loadError && activeInsights.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
          No active device insights need homeowner attention right now.
        </div>
      ) : null}

      {activeInsights.length ? (
        <div className="mt-5 space-y-5">
          {getMonitoringInsightGroupOrder().map((groupKey) => {
            const groupedMonitoringInsights = groupMonitoringInsights(activeInsights);
            const groupEvents = groupedMonitoringInsights[groupKey] || [];
            const groupMeta = getMonitoringInsightGroupMeta(groupKey);

            if (!groupEvents.length) return null;

            return (
              <div
                key={groupKey}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      {groupMeta.title}
                    </h4>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {groupMeta.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {groupEvents.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {groupEvents.map((event) => (
                    <HomeownerDeviceInsightCard
                      key={event?.id || `${event?.provider}-${event?.occurred_at}`}
                      event={event}
                      apiBaseUrl={apiBaseUrl}
                      onRefresh={loadDeviceInsights}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {archivedInsights.length ? (
        <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Show handled / archived device insights ({archivedInsights.length})
          </summary>

          <div className="mt-4 space-y-4">
            {archivedInsights.map((event) => (
              <HomeownerDeviceInsightCard
                key={event?.id || `${event?.provider}-${event?.occurred_at}`}
                event={event}
                apiBaseUrl={apiBaseUrl}
                onRefresh={loadDeviceInsights}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}


export default function HomeFaxStandardFindingsSection() {
  // Dashboard Monitoring Timeline Pass 1A
  const apiBaseUrl = getApiBaseUrl();
  const recordId = getRecordIdFromUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [verifiedPayload, setVerifiedPayload] = useState(null);
  const [monitoringPlansPayload, setMonitoringPlansPayload] = useState(null);
  const [monitoringEventsPayload, setMonitoringEventsPayload] = useState(null);
  const [monitoringError, setMonitoringError] = useState("");
  const [expandedMonitoringPlanIds, setExpandedMonitoringPlanIds] = useState(() => new Set());
  const [decisionFilter, setDecisionFilter] = useState("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [bulkExpandCommand, setBulkExpandCommand] = useState({ expanded: null, version: 0 });
  const [copyMessage, setCopyMessage] = useState("");
  const [copyText, setCopyText] = useState("");

  async function loadMonitoringLifecycle({ quiet = false } = {}) {
    try {
      setMonitoringError("");

      const [plansResponse, eventsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/monitoring-plans/${encodeURIComponent(recordId)}`),
        fetch(`${apiBaseUrl}/monitoring-events/${encodeURIComponent(recordId)}`),
      ]);

      const plansData = await plansResponse.json().catch(() => null);
      const eventsData = await eventsResponse.json().catch(() => null);

      if (!plansResponse.ok || plansData?.success === false) {
        throw new Error(plansData?.detail || plansData?.message || "Could not load monitoring plans.");
      }

      if (!eventsResponse.ok || eventsData?.success === false) {
        throw new Error(eventsData?.detail || eventsData?.message || "Could not load monitoring events.");
      }

      setMonitoringPlansPayload(plansData);
      setMonitoringEventsPayload(eventsData);
    } catch (err) {
      setMonitoringPlansPayload(null);
      setMonitoringEventsPayload(null);

      if (!quiet) {
        setMonitoringError(err.message || "Could not load monitoring lifecycle.");
      }
    }
  }

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
      await loadMonitoringLifecycle({ quiet: true });

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

  useEffect(() => {
    function handleExternalMonitoringRefresh() {
      loadMonitoringLifecycle({ quiet: true });
    }

    window.addEventListener("homefax:refresh-standard-findings", handleExternalMonitoringRefresh);

    return () => {
      window.removeEventListener("homefax:refresh-standard-findings", handleExternalMonitoringRefresh);
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
        // Homeowner Selected Image Merge Patch
        homeowner_image_decision: verified.homeowner_image_decision,
        homeowner_selected_image_url:
          verified.homeowner_selected_image_url || issue.homeowner_selected_image_url || "",
        homeowner_selected_image_note:
          verified.homeowner_selected_image_note || issue.homeowner_selected_image_note || "",
        homeowner_selected_image_updated_at:
          verified.homeowner_selected_image_updated_at || issue.homeowner_selected_image_updated_at || "",
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

  const monitoringPlans = monitoringPlansPayload?.monitoring_plans || [];
  const monitoringEvents = monitoringEventsPayload?.events || [];

  const latestMonitoringEvents = useMemo(() => {
    return [...monitoringEvents].slice(0, 5);
  }, [monitoringEvents]);

  const monitoringPlanByIssueId = useMemo(() => {
    const map = new Map();

    for (const plan of monitoringPlans) {
      if (plan?.source_issue_id !== undefined && plan?.source_issue_id !== null) {
        map.set(String(plan.source_issue_id), plan);
      }
    }

    return map;
  }, [monitoringPlans]);

  const monitoringEventCountByIssueId = useMemo(() => {
    const map = new Map();

    for (const event of monitoringEvents) {
      if (event?.source_issue_id !== undefined && event?.source_issue_id !== null) {
        const key = String(event.source_issue_id);
        map.set(key, (map.get(key) || 0) + 1);
      }
    }

    return map;
  }, [monitoringEvents]);

  const standardIssueByIdForMonitoring = useMemo(() => {
    const map = new Map();

    for (const issue of issues || []) {
      if (issue?.id !== undefined && issue?.id !== null) {
        map.set(String(issue.id), issue);
      }
    }

    return map;
  }, [issues]);

  const monitoringEventsByIssueId = useMemo(() => {
    const map = new Map();

    for (const event of monitoringEvents) {
      if (event?.source_issue_id !== undefined && event?.source_issue_id !== null) {
        const key = String(event.source_issue_id);

        if (!map.has(key)) {
          map.set(key, []);
        }

        map.get(key).push(event);
      }
    }

    return map;
  }, [monitoringEvents]);

  const monitoringEnabledIssueCount = monitoringPlans.length;
  const monitoringEventCount = monitoringEvents.length;

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

  function toggleMonitoringPlanExpanded(planId) {
    const key = String(planId || "");

    if (!key) return;

    setExpandedMonitoringPlanIds((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
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

      {/* Dashboard Monitoring Timeline Pass 1A */}

      <HomeownerDeviceConnectionsSection
        apiBaseUrl={apiBaseUrl}
        recordId={recordId}
      />

      <HomeownerDeviceEventInsightsSection
        apiBaseUrl={apiBaseUrl}
        recordId={recordId}
      />

      <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-blue-800">
              Monitoring Lifecycle
            </div>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              Active Monitoring Plans & Device Events
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Locked monitored findings can now create HomeFax monitoring plans. Device, sensor, manual, and future integration events attach to these plans and become part of the property timeline.
            </p>
            {monitoringError ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                {monitoringError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Monitoring Plans
              </div>
              <div className="mt-1 text-2xl font-black text-blue-900">
                {monitoringEnabledIssueCount}
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                Timeline Events
              </div>
              <div className="mt-1 text-2xl font-black text-blue-900">
                {monitoringEventCount}
              </div>
            </div>
          </div>
        </div>

        {monitoringPlans.length ? (
          <div className="mt-5">
            <div className="mb-2 text-sm font-black text-slate-900">
              Active Monitoring Plans
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {monitoringPlans.slice(0, 4).map((plan) => {
                const capabilities = Array.isArray(plan.allowed_capabilities)
                  ? plan.allowed_capabilities
                  : [];

                const eventCount = monitoringEventCountByIssueId.get(String(plan.source_issue_id)) || 0;

                return (
                  <div
                    key={plan.id || plan.source_issue_id}
                    className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-black text-slate-950">
                        Issue #{plan.source_issue_id}
                      </div>
                      <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-black text-white">
                        {plan.status || "active"}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-bold text-slate-700">
                      {plan.system || plan.component || plan.location || "Monitoring plan"}
                    </div>

                    <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                      <div>
                        <span className="font-black text-slate-800">Risk:</span>{" "}
                        {plan.risk_type || "general_monitoring"}
                      </div>
                      <div>
                        <span className="font-black text-slate-800">Events:</span>{" "}
                        {eventCount}
                      </div>
                    </div>

                    {plan.monitoring_plan_text ? (
                      <div className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-950">
                        {plan.monitoring_plan_text}
                      </div>
                    ) : null}

                    <MonitoringPlanIntelligenceCard plan={plan} />

                    {(() => {
                      const planKey = String(plan.id || plan.source_issue_id || plan.issue_id || "");
                      const issueKey = String(plan.source_issue_id || plan.issue_id || "");
                      const isExpanded = expandedMonitoringPlanIds.has(planKey);
                      const matchedIssue = standardIssueByIdForMonitoring.get(issueKey);
                      const relatedEvents = monitoringEventsByIssueId.get(issueKey) || [];

                      return (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => toggleMonitoringPlanExpanded(planKey)}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-black text-blue-800 shadow-sm hover:bg-blue-50"
                          >
                            {isExpanded ? "Hide Monitoring Record" : "View Monitoring Record"}
                          </button>

                          {isExpanded ? (
                            <MonitoringPlanEvidenceDrawer
                              plan={plan}
                              issue={matchedIssue}
                              events={relatedEvents}
                              apiBaseUrl={apiBaseUrl}
                            />
                          ) : null}
                        </div>
                      );
                    })()}

                    {capabilities.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {capabilities.map((capability) => (
                          <span
                            key={`${plan.id}-${capability}`}
                            className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-900"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-white/70 p-4 text-sm font-semibold text-slate-600">
            No active monitoring plans yet. When a monitored issue is final approved and locked, HomeFax will create a monitoring plan automatically.
          </div>
        )}

        {latestMonitoringEvents.length ? (
          <div className="mt-5">
            <div className="mb-2 text-sm font-black text-slate-900">
              Latest Monitoring Events
            </div>

            <div className="space-y-3">
              {latestMonitoringEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-sm font-black text-slate-950">
                        {event.title || "Monitoring event"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        Issue #{event.source_issue_id || "unlinked"} · Plan #{event.monitoring_plan_id || "none"} · {event.provider || "unknown provider"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                        {event.capability || "MANUAL_CHECK"}
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">
                        {event.severity || "info"}
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-900">
                        {event.event_status || "unreviewed"}
                      </span>
                    </div>
                  </div>

                  {event.summary ? (
                    <div className="mt-3 text-sm leading-6 text-slate-700">
                      {event.summary}
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                    <div>
                      <span className="font-black text-slate-700">Device:</span>{" "}
                      {event.device_name || event.device_id || "not specified"}
                    </div>
                    <div>
                      <span className="font-black text-slate-700">Homeowner Ack:</span>{" "}
                      {event.homeowner_acknowledged || "no"}
                    </div>
                    <div>
                      <span className="font-black text-slate-700">Occurred:</span>{" "}
                      {event.occurred_at || event.created_at || "not available"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
            monitoringPlan={monitoringPlanByIssueId.get(String(issue.id))}
            monitoringEventCount={monitoringEventCountByIssueId.get(String(issue.id)) || 0}
            forcedExpanded={bulkExpandCommand}
            onRefresh={() => loadStandardFindings({ quiet: true })}
          />
        ))}
      </div>
    </section>
  );
}
