import React, { useMemo, useState } from "react";
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

function getTitle(issue) {
  return pickFirst(
    issue.source_finding_title,
    issue.title,
    issue.defect_type,
    "Untitled Finding"
  );
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

function getRecommendedAction(issue) {
  return pickFirst(
    issue.recommended_action,
    issue.standard_recommended_action,
    issue.source_recommendation,
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

export default function HomeFaxStandardFindingCard({ issue, apiBaseUrl }) {
  const [expanded, setExpanded] = useState(false);

  const title = getTitle(issue);
  const itemNumber = pickFirst(issue.source_item_number);
  const location = getLocation(issue);
  const sourceText = getSourceText(issue);
  const explanation = getHomeFaxExplanation(issue);
  const action = getRecommendedAction(issue);
  const trade = getRecommendedTrade(issue);
  const monitoringPlan = getMonitoringPlan(issue);

  const system = pickFirst(issue.system, issue.standard_system);
  const component = pickFirst(issue.component, issue.standard_component);
  const category = pickFirst(issue.category, issue.standard_category);
  const defectType = pickFirst(issue.defect_type, issue.standard_defect_type);

  const images = useMemo(() => getImages(issue), [issue]);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {itemNumber ? <Pill>Item {itemNumber}</Pill> : null}
              {category ? <Pill>{category}</Pill> : null}
              {defectType ? <Pill>{defectType}</Pill> : null}
              {issue.candidate_image_count ? (
                <Pill>{issue.candidate_image_count} Image Candidates</Pill>
              ) : null}
            </div>

            <h3 className="text-xl font-black text-slate-950">
              {title}
            </h3>

            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-900">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="uppercase tracking-wide text-red-700">
                  Location / Area:
                </span>{" "}
                {location}
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

        <SectionBlock icon={ShieldAlert} title="HomeFax Explanation" tone="homefax">
          {explanation}
        </SectionBlock>

        <div className="grid gap-4 md:grid-cols-2">
          <SectionBlock icon={Wrench} title="Recommended Action" tone="action">
            {action}
          </SectionBlock>

          <SectionBlock icon={ClipboardCheck} title="Who Should Review This">
            {trade}
          </SectionBlock>
        </div>

        <SectionBlock icon={Activity} title="Monitoring Plan">
          {monitoringPlan}
        </SectionBlock>

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
                    Finding Location
                  </div>
                  <div>{location}</div>
                </div>
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
