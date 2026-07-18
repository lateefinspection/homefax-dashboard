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
      issue.issueTitle,
      issue.section,
      issue.system,
      issue.component,
      issue.summary,
      issue.location,
      issue.type,
    ].join(" ")
  );

  if (
    text.includes("plumbing") ||
    text.includes("leak") ||
    text.includes("water") ||
    text.includes("valve") ||
    text.includes("supply") ||
    text.includes("shut-off") ||
    text.includes("shut off") ||
    text.includes("hot water") ||
    text.includes("water heater") ||
    text.includes("heater") ||
    text.includes("drain") ||
    text.includes("waste") ||
    text.includes("vent") ||
    text.includes("pipe")
  ) {
    return "Licensed plumber";
  }

  if (
    text.includes("electrical") ||
    text.includes("electric") ||
    text.includes("gfci") ||
    text.includes("gfcis") ||
    text.includes("afci") ||
    text.includes("breaker") ||
    text.includes("panel") ||
    text.includes("panelboard") ||
    text.includes("wiring") ||
    text.includes("meter") ||
    text.includes("disconnect")
  ) {
    return "Licensed electrician";
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
  const text = normalizeIssueText(
    [
      title,
      issue.issueTitle,
      issue.section,
      issue.system,
      issue.component,
      issue.location,
      issue.summary,
      issue.type,
    ].join(" ")
  );

  let contractor = getContractorType(issue);
  const urgency = getHomeownerUrgency(issue);

  let plainTitle = title;
  let whatItMeans = "The inspection report flagged this item as something that should be reviewed.";
  let whyItMatters = "Inspection findings can affect safety, maintenance costs, insurance, resale value, or long-term property condition.";
  let nextStep = `Have a ${contractor.toLowerCase()} review this item and recommend the proper correction.`;

  /*
    IMPORTANT:
    Plumbing/water rules come before generic electrical language.
    The report sometimes has generic recommendation text that mentions a contractor,
    so we prioritize the actual section/component/title first.
  */

  if (text.includes("active water leak") || text.includes("leak at valve") || text.includes("water leak")) {
    contractor = "Licensed plumber";
    plainTitle = "Active water leak";
    whatItMeans = "The inspection found water leaking from a valve, pipe, or plumbing connection.";
    whyItMatters = "Active leaks can cause water damage, mold, higher water bills, and hidden damage if they are not repaired.";
    nextStep = "Have a licensed plumber inspect the leaking area and repair it as soon as possible.";
  } else if (
    text.includes("main water supply") ||
    text.includes("water supply") ||
    text.includes("main water shut") ||
    text.includes("shut-off valve") ||
    text.includes("shut off valve") ||
    text.includes("water valve")
  ) {
    contractor = "Licensed plumber";
    plainTitle = "Main water supply needs repair";
    whatItMeans = "The inspection found a concern with the main water supply or shutoff valve area.";
    whyItMatters = "The main water shutoff is important because it controls water to the home during leaks, repairs, or emergencies.";
    nextStep = "Have a licensed plumber inspect the main shutoff valve, nearby piping, and supply connections.";
  } else if (text.includes("hot water source") || text.includes("water heater") || text.includes("hot water") || text.includes("old system")) {
    contractor = "Licensed plumber";
    plainTitle = "Water heater or hot water system needs review";
    whatItMeans = "The inspector noted an issue or age concern with the hot water system.";
    whyItMatters = "Older or defective water heaters can leak, stop producing hot water, or become unsafe if not maintained.";
    nextStep = "Have a licensed plumber evaluate the water heater condition, safety, and expected remaining service life.";
  } else if (text.includes("pipe support") || text.includes("drain") || text.includes("waste") || text.includes("vent") || text.includes("pipe")) {
    contractor = "Licensed plumber";
    plainTitle = "Plumbing pipe needs correction";
    whatItMeans = "A plumbing pipe, drain, waste line, vent, or support may not be installed or supported properly.";
    whyItMatters = "Poor pipe support or defective plumbing can lead to leaks, slow drainage, loose fittings, or future damage.";
    nextStep = "Have a licensed plumber inspect and correct the affected piping.";
  } else if (text.includes("kitchen sink")) {
    contractor = "Licensed plumber";
    plainTitle = "Kitchen sink needs repair";
    whatItMeans = "The inspection found a concern at or below the kitchen sink.";
    whyItMatters = "Sink defects can lead to leaks, cabinet damage, drainage problems, or hidden moisture.";
    nextStep = "Have a licensed plumber inspect the kitchen sink, faucet, drain, and supply connections.";
  } else if (text.includes("gfci") || text.includes("gfcis") || text.includes("ground fault")) {
    contractor = "Licensed electrician";
    plainTitle = text.includes("wouldn't reset") || text.includes("would not reset")
      ? "GFCI outlet would not reset"
      : "Missing GFCI shock protection";
    whatItMeans = "This outlet or circuit may be missing GFCI protection, or the GFCI device may not be working properly.";
    whyItMatters = "GFCI protection helps reduce the risk of electric shock in areas near water, such as kitchens, bathrooms, laundry rooms, garages, exteriors, and unfinished spaces.";
    nextStep = "Have a licensed electrician test the outlet or circuit and install or replace GFCI protection where required.";
  } else if (text.includes("afci") || text.includes("arc fault")) {
    contractor = "Licensed electrician";
    plainTitle = "Missing AFCI fire protection";
    whatItMeans = "This circuit may be missing AFCI protection. AFCI devices help detect dangerous electrical arcing.";
    whyItMatters = "Arc faults can increase fire risk, especially where wiring or connected devices are damaged or aging.";
    nextStep = "Have a licensed electrician evaluate the circuit and add AFCI protection where required.";
  } else if (text.includes("open breaker") || text.includes("knockout") || text.includes("filler plate")) {
    contractor = "Licensed electrician";
    plainTitle = "Open space in the electrical panel";
    whatItMeans = "There appears to be an opening in the electrical panel where a cover or filler plate should be installed.";
    whyItMatters = "Openings in an electrical panel can expose energized parts and create a shock or safety hazard.";
    nextStep = "Have a licensed electrician install the proper filler plate and check the panel for safety.";
  } else if (text.includes("improper wiring") || text.includes("wiring")) {
    contractor = "Licensed electrician";
    plainTitle = "Electrical wiring needs review";
    whatItMeans = "The inspection report found wiring that may not be installed correctly or safely.";
    whyItMatters = "Electrical defects can increase the risk of shock, overheating, or fire.";
    nextStep = "Have a licensed electrician evaluate and correct the wiring.";
  } else if (text.includes("electric meter") || text.includes("meter base") || text.includes("main service disconnect") || text.includes("panelboard") || text.includes("breaker")) {
    contractor = "Licensed electrician";
    plainTitle = "Electrical service equipment needs review";
    whatItMeans = "The inspection report found a concern at the electrical service equipment, meter, disconnect, panel, or breakers.";
    whyItMatters = "Electrical service defects can affect safety and may create shock, overheating, or fire risks.";
    nextStep = "Have a licensed electrician evaluate the equipment and make the recommended corrections.";
  } else if (text.includes("qualified electrician") || text.includes("quali")) {
    contractor = "Licensed electrician";
    plainTitle = "Electrical item needs licensed electrician review";
    whatItMeans = "The inspector is recommending that a qualified electrician evaluate this electrical concern.";
    whyItMatters = "Electrical defects are safety-sensitive and should be reviewed by a licensed professional rather than guessed at visually.";
    nextStep = "Have a licensed electrician inspect the item and provide repair recommendations.";
  } else if (text.includes("gas connection") || text.includes("range") || text.includes("oven") || text.includes("cooktop")) {
    contractor = "Qualified appliance or gas contractor";
    plainTitle = "Appliance gas connection needs review";
    whatItMeans = "The report noted a concern with the gas connection or fuel setup for a kitchen appliance.";
    whyItMatters = "Gas connections must be installed correctly to avoid leaks, unsafe operation, or appliance performance issues.";
    nextStep = "Have a qualified gas/appliance contractor confirm the appliance connection and correct it if needed.";
  } else if (text.includes("flashing")) {
    contractor = "Qualified roofing contractor";
    plainTitle = "Missing or defective flashing";
    whatItMeans = "Flashing is the material that helps keep water out where roof surfaces meet walls, vents, chimneys, or edges.";
    whyItMatters = "Missing or damaged flashing is a common source of leaks.";
    nextStep = "Have a qualified roofing contractor inspect and repair the flashing.";
  } else if (text.includes("gutter") || text.includes("downspout")) {
    contractor = "Gutter or roofing contractor";
    plainTitle = "Gutter or downspout needs repair";
    whatItMeans = "The gutter or downspout system may be loose, damaged, missing, or draining too close to the house.";
    whyItMatters = "Poor roof drainage can send water toward the foundation, siding, roof edges, or basement/crawlspace.";
    nextStep = "Have a gutter or roofing contractor repair the system and confirm water drains away from the home.";
  } else if (text.includes("roof") || text.includes("shingle") || text.includes("roof-covering") || text.includes("penetration")) {
    contractor = "Qualified roofing contractor";
    plainTitle = "Roof covering needs repair";
    whatItMeans = "The inspection found missing, damaged, or improperly installed roof-covering material.";
    whyItMatters = "Roof defects can allow water into the home and lead to interior damage or mold.";
    nextStep = "Have a qualified roofing contractor inspect the area and repair or replace damaged materials.";
  } else if (text.includes("wall-covering") || text.includes("siding") || text.includes("exterior wall")) {
    contractor = "Siding or exterior contractor";
    plainTitle = "Exterior wall covering needs repair";
    whatItMeans = "The exterior wall covering, siding, or trim may be damaged, loose, or not properly protecting the wall.";
    whyItMatters = "Exterior covering defects can allow moisture behind the wall surface and lead to rot or hidden damage.";
    nextStep = "Have a siding or exterior contractor repair the damaged or loose material and check for moisture damage.";
  } else if (text.includes("eaves") || text.includes("soffit") || text.includes("soï") || text.includes("fascia")) {
    contractor = "Roofing or exterior contractor";
    plainTitle = "Eaves, soffit, or fascia damage";
    whatItMeans = "The inspection found damage around the roof edge area, such as the eaves, soffit, or fascia.";
    whyItMatters = "Damage in this area can allow water, pests, or rot to affect the roof edge and attic ventilation areas.";
    nextStep = "Have a roofing or exterior contractor inspect and repair the damaged materials.";
  } else if (text.includes("windowpane") || text.includes("cracked window")) {
    contractor = "Window or glass contractor";
    plainTitle = "Cracked window glass";
    whatItMeans = "A windowpane is cracked or damaged.";
    whyItMatters = "Cracked glass can worsen, reduce weather protection, and create a safety concern.";
    nextStep = "Have a window or glass contractor replace the damaged pane.";
  } else if (text.includes("window screen")) {
    contractor = "Window repair contractor or handyman";
    plainTitle = "Damaged window screen";
    whatItMeans = "A window screen is damaged or not functioning as intended.";
    whyItMatters = "A damaged screen can allow insects in and may reduce normal window use.";
    nextStep = "Repair or replace the damaged screen.";
  } else if (text.includes("wood rot") || text.includes("rot at door")) {
    contractor = "Carpenter or exterior contractor";
    plainTitle = "Wood rot at door area";
    whatItMeans = "Wood near a door appears deteriorated or rotted.";
    whyItMatters = "Wood rot can spread, weaken trim or framing, and allow water or pests into the home.";
    nextStep = "Have a carpenter or exterior contractor remove damaged wood, repair the source of moisture, and replace affected materials.";
  } else if (text.includes("door")) {
    contractor = "Door repair contractor or handyman";
    plainTitle = "Door needs repair";
    whatItMeans = "The inspection found damage or a defect at a door.";
    whyItMatters = "Door defects can affect security, weather protection, energy efficiency, or normal use.";
    nextStep = "Have a qualified repair professional adjust, repair, or replace the affected door component.";
  } else if (text.includes("ledger") || text.includes("deck") || text.includes("balcon") || text.includes("porch") || text.includes("patio")) {
    contractor = "Deck contractor or structural professional";
    plainTitle = "Deck or porch structure needs review";
    whatItMeans = "The inspection found a concern with a deck, porch, balcony, ledger board, or related structural component.";
    whyItMatters = "Deck and porch defects can affect safety, especially where people walk, sit, or gather.";
    nextStep = "Have a deck contractor or structural professional evaluate and repair the affected component.";
  } else if (text.includes("handrail") || text.includes("guardrail") || text.includes("railing")) {
    contractor = "Carpenter or railing contractor";
    plainTitle = "Handrail or guardrail needs correction";
    whatItMeans = "The inspection found a handrail, guardrail, or railing that may not be safe or easy to use.";
    whyItMatters = "Railings and handrails help prevent falls and should be secure and properly shaped.";
    nextStep = "Have a carpenter or railing contractor correct the handrail or guardrail.";
  } else if (text.includes("fence")) {
    contractor = "Fence contractor";
    plainTitle = "Fence needs repair";
    whatItMeans = "The inspection found a defect with the fence.";
    whyItMatters = "Fence defects can affect security, privacy, pets, and property boundary function.";
    nextStep = "Have a fence contractor or qualified repair professional correct the damaged area.";
  } else if (text.includes("corrosion") || text.includes("rust")) {
    plainTitle = "Rust or corrosion needs review";
    whatItMeans = "The inspection found rust or corrosion on a component.";
    whyItMatters = "Rust can indicate age, moisture exposure, or deterioration that may reduce service life.";
    nextStep = `Have a ${contractor.toLowerCase()} evaluate whether the rust is cosmetic or needs repair/replacement.`;
  } else if (text.includes("heating system") || text.includes("heat source") || text.includes("thermostat") || text.includes("cooling")) {
    contractor = "Licensed HVAC contractor";
    plainTitle = text.includes("thermostat") ? "Thermostat needs review" : "Heating or cooling system needs review";
    whatItMeans = "The inspection found a concern with the heating, cooling, thermostat, or heat source.";
    whyItMatters = "HVAC defects can affect comfort, safety, energy cost, or system reliability.";
    nextStep = "Have a licensed HVAC contractor evaluate the system and recommend repair or replacement if needed.";
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

function getFilteredCandidateUrls(urls = [], hiddenUrls = []) {
  const hidden = new Set(hiddenUrls || []);
  const seen = new Set();

  return (Array.isArray(urls) ? urls : [])
    .filter(Boolean)
    .filter((url) => {
      if (hidden.has(url)) return false;
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}

function ImageLightbox({ image, onClose }) {
  if (!image?.url) return null;

  const fullUrl = joinUrl(API_BASE, image.url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
      <div className="relative max-h-[92vh] w-full max-w-6xl rounded-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900">
              {image.title || "Image preview"}
            </p>
            <p className="break-all text-xs text-slate-500">
              {image.url}
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              Open in new tab
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex max-h-[78vh] items-center justify-center overflow-auto rounded-2xl bg-slate-100">
          <img
            src={fullUrl}
            alt={image.title || "Image preview"}
            className="max-h-[78vh] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function getAiScoreView(aiImageData) {
  const score = Number(aiImageData?.best_ai_match_score || 0);
  const reason = aiImageData?.best_ai_reason || "";

  if (!aiImageData) {
    return {
      loaded: false,
      score,
      reason,
      label: "AI image ranking not loaded",
      className: "border-slate-200 bg-slate-100 text-slate-700",
      shouldPromote: false,
    };
  }

  if (score >= 85) {
    return {
      loaded: true,
      score,
      reason,
      label: `Strong AI image match · ${score}`,
      className: "border-emerald-200 bg-emerald-100 text-emerald-800",
      shouldPromote: true,
    };
  }

  if (score >= 65) {
    return {
      loaded: true,
      score,
      reason,
      label: `Possible AI image match · ${score}`,
      className: "border-blue-200 bg-blue-100 text-blue-800",
      shouldPromote: true,
    };
  }

  if (score >= 40) {
    return {
      loaded: true,
      score,
      reason,
      label: `Weak AI image match · ${score}`,
      className: "border-amber-200 bg-amber-100 text-amber-800",
      shouldPromote: true,
    };
  }

  return {
    loaded: true,
    score,
    reason,
    label: `No strong image match · ${score}`,
    className: "border-red-200 bg-red-100 text-red-800",
    shouldPromote: false,
  };
}

function CandidateImages({
  issue,
  selectedImage,
  setSelectedImage,
  disabled,
  hiddenCandidateUrls,
  onHideCandidate,
  onPreviewImage,
  rankedCandidateImageUrls = [],
}) {
  const [showAll, setShowAll] = useState(false);

  const sourceCandidateUrls =
    Array.isArray(rankedCandidateImageUrls) && rankedCandidateImageUrls.length
      ? rankedCandidateImageUrls
      : issue.candidate_image_urls || [];

  const candidates = getFilteredCandidateUrls(
    sourceCandidateUrls,
    hiddenCandidateUrls || []
  );

  const visibleCandidates = showAll ? candidates : candidates.slice(0, 6);

  if (!candidates.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        No useful candidate images available. Use “Image Mismatch” or “Needs Review” if the suggested image is wrong.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Candidate images
          </p>
          <p className="text-xs text-slate-500">
            Select one image, then approve it. Click image to inspect larger.
          </p>
        </div>

        {candidates.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            {showAll ? "Show fewer" : `Show all ${candidates.length}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {visibleCandidates.map((url, index) => {
          const fullUrl = joinUrl(API_BASE, url);
          const isSelected = selectedImage === url;

          return (
            <div
              key={`${url}-${index}`}
              className={`overflow-hidden rounded-xl border bg-white ${
                isSelected
                  ? "border-emerald-600 ring-4 ring-emerald-200"
                  : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(url);
                  onPreviewImage({
                    url,
                    title: `${issue.title || "Issue"} candidate ${index + 1}`,
                  });
                }}
                className="relative block w-full"
                title={`Preview and select candidate image ${index + 1}`}
              >
                {isSelected && (
                  <span className="absolute left-2 top-2 z-10 rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white shadow">
                    SELECTED
                  </span>
                )}

                <img
                  src={fullUrl}
                  alt={`Candidate ${index + 1}`}
                  className="h-40 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </button>

              <div className="flex items-center justify-between gap-1 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setSelectedImage(url)}
                  disabled={disabled}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {isSelected ? "Selected" : `Select #${index + 1}`}
                </button>

                <button
                  type="button"
                  onClick={() => onHideCandidate(url)}
                  disabled={disabled}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Hide this bad candidate from this screen"
                >
                  Hide
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function IssueCard({ issue, onRefresh, busyId, setBusyId, aiImageData }) {
  const [note, setNote] = useState("");
  const [selectedImage, setSelectedImage] = useState(issue.image_url || "");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [hiddenCandidateUrls, setHiddenCandidateUrls] = useState([]);

  const friendly = getPlainLanguageFinding(issue);
  const imageTrust = getImageTrustLabel(issue);
  const aiScoreView = getAiScoreView(aiImageData);
  const aiRankedCandidates = aiImageData?.ai_ranked_candidates || [];
  const aiRankedCandidateImageUrls =
    aiImageData?.ai_ranked_candidate_image_urls ||
    aiRankedCandidates.map((candidate) => candidate.url).filter(Boolean);
  const aiBestImageUrl =
    aiScoreView.shouldPromote && aiImageData?.best_image_url
      ? aiImageData.best_image_url
      : "";

  useEffect(() => {
    const aiPreferredImage =
      aiScoreView.shouldPromote && aiImageData?.best_image_url
        ? aiImageData.best_image_url
        : "";

    setSelectedImage(issue.verified_image_url || aiPreferredImage || issue.image_url || "");
    setNote("");
    setHiddenCandidateUrls([]);
    setLightboxImage(null);
  }, [
    issue.id,
    issue.image_url,
    issue.verified_image_url,
    aiImageData?.best_image_url,
    aiImageData?.best_ai_match_score,
  ]);

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

  const aiLoaded = Boolean(aiImageData);
  const imageUrl =
    issue.verified_image_url ||
    aiBestImageUrl ||
    (!aiLoaded ? issue.image_url || "" : "");

  const fullImageUrl = imageUrl ? joinUrl(API_BASE, imageUrl) : "";
  const selectedFullImageUrl = selectedImage ? joinUrl(API_BASE, selectedImage) : "";
  const verifiedFullImageUrl = issue.verified_image_url
    ? joinUrl(API_BASE, issue.verified_image_url)
    : "";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <ImageLightbox image={lightboxImage} onClose={() => setLightboxImage(null)} />

      <div className="space-y-5">
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

        <div className="grid gap-3 lg:grid-cols-3">
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

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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

        <details className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-900">
            Show original inspector language
          </summary>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {issue.summary || "No original summary available."}
          </p>
        </details>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Photo review
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Review the finding above first, then choose the image that best proves the defect.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className={imageTrust.className}>{imageTrust.label}</Badge>
              <Badge className={aiScoreView.className}>{aiScoreView.label}</Badge>
            </div>
          </div>

          {aiScoreView.loaded ? (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                AI image reasoning
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {aiScoreView.reason || "No AI reason returned."}
              </p>

              {!aiScoreView.shouldPromote ? (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  AI did not find a strong visual match. Do not approve an image unless admin can clearly verify it.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              AI image ranking has not been loaded for this issue yet.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm leading-5 text-slate-600">
              {imageTrust.explanation}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Tip: click any image to expand it before approving.
            </p>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[380px_1fr]">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current suggested / verified image
                </p>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {fullImageUrl ? (
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() =>
                        setLightboxImage({
                          url: imageUrl,
                          title: issue.verified_image_url
                            ? "Admin verified image"
                            : "AI suggested image",
                        })
                      }
                    >
                      <img
                        src={fullImageUrl}
                        alt={friendly.plainTitle || issue.title || "Issue"}
                        className="h-80 w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </button>
                  ) : (
                    <div className="flex h-80 items-center justify-center text-slate-400">
                      <ImageOff className="mr-2 h-5 w-5" />
                      No image
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected image to approve
                  </p>
                  {selectedImage ? (
                    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800">
                      Ready to approve
                    </Badge>
                  ) : (
                    <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                      No selection
                    </Badge>
                  )}
                </div>

                {selectedFullImageUrl ? (
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() =>
                      setLightboxImage({
                        url: selectedImage,
                        title: "Selected image",
                      })
                    }
                  >
                    <img
                      src={selectedFullImageUrl}
                      alt="Selected issue image"
                      className="h-80 w-full rounded-xl border-4 border-emerald-300 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </button>
                ) : (
                  <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
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
                    Approve Selected Image
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
            </div>

            <CandidateImages
              issue={issue}
              selectedImage={selectedImage}
              setSelectedImage={setSelectedImage}
              disabled={busy || locked}
              hiddenCandidateUrls={hiddenCandidateUrls}
              rankedCandidateImageUrls={aiRankedCandidateImageUrls}
              onHideCandidate={(url) =>
                setHiddenCandidateUrls((prev) =>
                  prev.includes(url) ? prev : [...prev, url]
                )
              }
              onPreviewImage={setLightboxImage}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Verified image
              </p>

              {verifiedFullImageUrl ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() =>
                    setLightboxImage({
                      url: issue.verified_image_url,
                      title: "Verified image",
                    })
                  }
                >
                  <img
                    src={verifiedFullImageUrl}
                    alt="Verified issue image"
                    className="h-56 w-full rounded-xl border border-emerald-200 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </button>
              ) : (
                <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                  No verified image yet
                </div>
              )}
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
          <div className="grid gap-3 md:grid-cols-2">
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
          className="min-h-20 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        />

        <details className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-900">
            Show review action buttons
          </summary>

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
        </details>

        {busy && (
          <div className="flex items-center text-sm text-slate-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Updating issue...
          </div>
        )}
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
  const [aiImageMap, setAiImageMap] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

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

  async function loadAiImagePreview(recordId = selectedRecord) {
    if (!recordId) {
      alert("Select a record before loading AI-ranked images.");
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      const res = await fetch(
        `${API_BASE}/records/${encodeURIComponent(recordId)}/image-intelligence-ai-preview?max_issues=10&max_candidates=5&top_k=3`
      );

      const data = await res.json();

      if (!res.ok || data?.success === false) {
        throw new Error(data?.detail?.error || data?.detail || data?.message || JSON.stringify(data));
      }

      const nextMap = {};

      for (const aiIssue of data.issues || []) {
        nextMap[aiIssue.issue_id] = aiIssue;
      }

      setAiImageMap(nextMap);
    } catch (e) {
      setAiError(e.message || "AI image ranking failed.");
    } finally {
      setAiLoading(false);
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

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                AI-ranked image review
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Loads AI-ranked candidates for this record. AI suggests the best image, but admin still verifies.
              </p>
              {aiError ? (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                  {aiError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                Loaded: {Object.keys(aiImageMap).length} issue(s)
              </Badge>

              <Button
                variant="primary"
                disabled={aiLoading || !selectedRecord}
                onClick={() => loadAiImagePreview(selectedRecord)}
              >
                <RefreshCw className={`h-4 w-4 ${aiLoading ? "animate-spin" : ""}`} />
                {aiLoading ? "Loading AI images..." : "Load AI Ranked Images"}
              </Button>
            </div>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Current safety limit: this loads up to 10 issues and 5 candidate images per issue from the read-only AI preview endpoint.
          </p>
        </div>

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
                  onChange={(e) => {
                    setSelectedRecord(e.target.value);
                    setAiImageMap({});
                    setAiError("");
                  }}
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
                  aiImageData={aiImageMap[issue.id]}
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
