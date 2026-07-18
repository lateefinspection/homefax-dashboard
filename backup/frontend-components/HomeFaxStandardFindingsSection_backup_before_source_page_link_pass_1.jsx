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

export default function HomeFaxStandardFindingsSection() {
  const apiBaseUrl = getApiBaseUrl();
  const recordId = getRecordIdFromUrl();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const url = `${apiBaseUrl}/records/${encodeURIComponent(
          recordId
        )}/homefax-standard-report-preview-clean?limit=100`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        if (alive) {
          setPayload(data);
        }
      } catch (err) {
        if (alive) {
          setError(err.message || "Unable to load HomeFax standard findings.");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [apiBaseUrl, recordId]);

  const issues = payload?.issues || [];

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
            <div className="text-3xl font-black">{issues.length}</div>
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

      <div className="grid gap-5">
        {issues.map((issue) => (
          <HomeFaxStandardFindingCard
            key={issue.id || `${issue.source_item_number}-${issue.title}`}
            issue={issue}
            apiBaseUrl={apiBaseUrl}
          />
        ))}
      </div>
    </section>
  );
}
