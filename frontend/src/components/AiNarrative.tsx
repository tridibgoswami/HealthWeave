/**
 * Renders the AI-generated health score narrative as structured, readable
 * sections instead of one unbroken wall of text.
 *
 * Two source shapes are supported:
 *  - New computations: backend stores a JSON-encoded object
 *    ({ summary, key_areas, reassuring_findings, next_steps, ... }).
 *  - Legacy computations: backend stored a plain string with emoji-prefixed
 *    ALL-CAPS headers (e.g. "⚠️ IMPORTANT DISCLAIMER: ..."), generated before
 *    this structured format existed. We split those into the same section
 *    shape so old and new health scores render consistently.
 */
import {
  AlertTriangle, Sparkles, CheckCircle2, ListChecks, Clock, type LucideIcon,
} from "lucide-react";
import { cn } from "../utils/cn";

type Section = { title: string; paragraphs: string[]; items: string[] };

type Tone = "slate" | "blue" | "amber" | "emerald" | "indigo";

const TONE_CLASSES: Record<Tone, { bg: string; border: string; text: string; icon: string }> = {
  slate:   { bg: "bg-slate-50",   border: "border-slate-200",   text: "text-slate-600",   icon: "text-slate-500" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-800",    icon: "text-brand-blue" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-800",   icon: "text-amber-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-800", icon: "text-emerald-600" },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-100",  text: "text-indigo-800",  icon: "text-indigo-600" },
};

function sectionStyle(title: string): { Icon: LucideIcon; tone: Tone } {
  const t = title.toUpperCase();
  if (t.includes("DISCLAIMER")) return { Icon: AlertTriangle, tone: "slate" };
  if (t.includes("REASSUR")) return { Icon: CheckCircle2, tone: "emerald" };
  if (t.includes("NEXT STEP") || t.includes("RECOMMEND")) return { Icon: ListChecks, tone: "indigo" };
  if (t.includes("CURRENCY") || t.includes("DATA WARNING")) return { Icon: Clock, tone: "amber" };
  if (t.includes("ATTENTION") || t.includes("RISK") || t.includes("GAP")) return { Icon: AlertTriangle, tone: "amber" };
  return { Icon: Sparkles, tone: "blue" };
}

// Splits a section body into list items when it looks like a numbered or
// bulleted list (e.g. "1. LIVER HEALTH: ... 2. CARDIO: ..." or "• Step one • Step two").
// List markers are capped at 2 digits so 4-digit years ("...approximately
// 2016. This...") in prose don't get misread as list item "2016.".
function splitListItems(body: string): string[] {
  if (/(?:^|\s)\d{1,2}\.\s+[A-Z]/.test(body)) {
    return body.split(/\s(?=\d{1,2}\.\s+[A-Z])/).map((s) => s.trim()).filter(Boolean);
  }
  if (body.includes("•")) {
    return body.split("•").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// Splits on emoji-prefixed ALL-CAPS headers, e.g. "⚠️ IMPORTANT DISCLAIMER:"
// or "--- 🔴 PRIMARY CONCERN — LIVER HEALTH (52/100)" (no trailing colon,
// "---" dividers instead of colons). A fresh regex literal is created per
// call — a shared module-level `g` regex would carry lastIndex state across
// calls and corrupt later parses.
function parseLegacyNarrative(raw: string): Section[] {
  const cleaned = raw.replace(/-{2,}/g, "\n");
  // Each header "word" must start with 2+ consecutive uppercase letters, so a
  // sentence-starting capital ("The", "Your"...) right after a header never
  // gets swallowed into it (single capital + lowercase fails the {2,} run).
  const headerPattern =
    /(\p{Extended_Pictographic}️?\s*(?:[A-Z]{2,}[A-Z0-9]*[\s/&—–-]*)+(?:\(\d{1,3}\/100[^)]*\))?:?)/gu;
  const parts = cleaned.split(headerPattern);
  if (parts.length <= 1) {
    return [{ title: "Summary", paragraphs: [raw.trim()], items: [] }];
  }

  const sections: Section[] = [];
  const pre = (parts[0] ?? "").trim();
  if (pre) sections.push({ title: "Summary", paragraphs: [pre], items: [] });

  for (let i = 1; i < parts.length; i += 2) {
    const header = (parts[i] ?? "").replace(/:$/, "").trim();
    const body = (parts[i + 1] ?? "").trim();
    if (!header) continue;
    const title = header.replace(/\p{Extended_Pictographic}️?/gu, "").trim();
    const items = splitListItems(body);
    sections.push({ title, paragraphs: items.length === 0 && body ? [body] : [], items });
  }
  return sections;
}

function parseStructuredNarrative(raw: string): Section[] | null {
  let obj: any;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;

  const sections: Section[] = [];
  if (obj.disclaimer) sections.push({ title: "Important Disclaimer", paragraphs: [String(obj.disclaimer)], items: [] });
  if (obj.summary) sections.push({ title: "Summary", paragraphs: [String(obj.summary)], items: [] });
  if (Array.isArray(obj.key_areas) && obj.key_areas.length) {
    sections.push({
      title: "Key Areas of Attention",
      paragraphs: [],
      items: obj.key_areas.map((a: any) =>
        typeof a === "string" ? a : `${a.title ?? ""}${a.score != null ? ` (${a.score}/100${a.status ? ` — ${a.status}` : ""})` : ""}: ${a.detail ?? ""}`
      ),
    });
  }
  if (Array.isArray(obj.reassuring_findings) && obj.reassuring_findings.length) {
    sections.push({ title: "Reassuring Findings", paragraphs: [], items: obj.reassuring_findings.map(String) });
  }
  if (Array.isArray(obj.next_steps) && obj.next_steps.length) {
    sections.push({ title: "Recommended Next Steps", paragraphs: [], items: obj.next_steps.map(String) });
  }
  if (obj.data_currency_warning) {
    sections.push({ title: "Data Currency Warning", paragraphs: [String(obj.data_currency_warning)], items: [] });
  }
  return sections.length ? sections : null;
}

export function AiNarrative({ raw, className }: { raw: string; className?: string }) {
  if (!raw) return null;
  const sections = parseStructuredNarrative(raw) ?? parseLegacyNarrative(raw);

  return (
    <div className={cn("space-y-2.5", className)}>
      {sections.map((section, i) => {
        const { Icon, tone } = sectionStyle(section.title);
        const c = TONE_CLASSES[tone];
        return (
          <div key={i} className={cn("flex gap-3 rounded-2xl p-3.5 border", c.bg, c.border)}>
            <Icon size={15} className={cn("shrink-0 mt-0.5", c.icon)} />
            <div className="min-w-0">
              <p className={cn("text-xs font-bold uppercase tracking-wide mb-1", c.text)}>{section.title}</p>
              {section.paragraphs.map((p, j) => (
                <p key={j} className={cn("text-sm leading-relaxed", c.text)}>{p}</p>
              ))}
              {section.items.length > 0 && (
                <ul className={cn("text-sm leading-relaxed space-y-1 mt-1", c.text)}>
                  {section.items.map((item, j) => (
                    <li key={j} className="flex gap-1.5">
                      <span className="opacity-50">•</span>
                      <span>{item.replace(/^\d+\.\s*/, "")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
