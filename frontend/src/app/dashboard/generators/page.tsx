"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type {
  MetadataResult,
  OutlineResult,
  WorkbookResult,
  ProductionDashboard,
} from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

type Tab =
  | "production"
  | "metadata"
  | "novel"
  | "workbook"
  | "tropes"
  | "conflicts"
  | "twists";

export default function GeneratorsPage() {
  const { toggleSidebar } = useSidebar();
  const [tab, setTab] = useState<Tab>("production");

  // Production
  const [production, setProduction] = useState<ProductionDashboard | null>(
    null
  );

  // Metadata
  const [metaTitle, setMetaTitle] = useState("");
  const [metaGenre, setMetaGenre] = useState("romance");
  const [metaTropes, setMetaTropes] = useState("");
  const [metaResult, setMetaResult] = useState<MetadataResult | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  // Novel outline
  const [novelTitle, setNovelTitle] = useState("");
  const [novelTrope, setNovelTrope] = useState("");
  const [novelProtag, setNovelProtag] = useState("");
  const [novelLI, setNovelLI] = useState("");
  const [novelSetting, setNovelSetting] = useState("");
  const [outlineResult, setOutlineResult] = useState<OutlineResult | null>(
    null
  );
  const [outlineLoading, setOutlineLoading] = useState(false);

  // Workbook
  const [wbSubject, setWbSubject] = useState("reading");
  const [wbGrade, setWbGrade] = useState("3rd Grade");
  const [wbTitle, setWbTitle] = useState("");
  const [wbResult, setWbResult] = useState<WorkbookResult | null>(null);
  const [wbLoading, setWbLoading] = useState(false);

  // Reference data
  const [tropes, setTropes] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<{
    internal: string[];
    external: string[];
    relational: string[];
  } | null>(null);
  const [plotTwists, setPlotTwists] = useState<Record<
    string,
    string[]
  > | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getProductionDashboard(token).then(setProduction).catch(() => {});
    api.getTropes(token).then((d) => setTropes(d.tropes)).catch(() => {});
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    if (tab === "conflicts" && !conflicts) {
      api.getConflicts(token).then(setConflicts).catch(() => {});
    }
    if (tab === "twists" && !plotTwists) {
      api.getPlotTwists(token).then(setPlotTwists).catch(() => {});
    }
  }, [tab, conflicts, plotTwists]);

  async function handleMetadata(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setMetaLoading(true);
    try {
      const result = await api.generateMetadata(token, {
        title: metaTitle,
        genre: metaGenre,
        tropes: metaTropes
          ? metaTropes.split(",").map((t) => t.trim())
          : undefined,
      });
      setMetaResult(result);
    } catch {
      /* ignore */
    }
    setMetaLoading(false);
  }

  async function handleOutline(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setOutlineLoading(true);
    try {
      const result = await api.generateNovelOutline(token, {
        title: novelTitle,
        trope: novelTrope || undefined,
        protagonist: novelProtag || undefined,
        love_interest: novelLI || undefined,
        setting: novelSetting || undefined,
      });
      setOutlineResult(result);
    } catch {
      /* ignore */
    }
    setOutlineLoading(false);
  }

  async function handleWorkbook(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setWbLoading(true);
    try {
      const result = await api.generateWorkbook(token, {
        subject: wbSubject,
        grade_level: wbGrade,
        title: wbTitle || undefined,
      });
      setWbResult(result);
    } catch {
      /* ignore */
    }
    setWbLoading(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "production", label: "Production" },
    { key: "metadata", label: "KDP Metadata" },
    { key: "novel", label: "Novel Outline" },
    { key: "workbook", label: "Workbook" },
    { key: "tropes", label: "Tropes" },
    { key: "conflicts", label: "Conflicts" },
    { key: "twists", label: "Plot Twists" },
  ];

  const inputCls =
    "px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900";
  const btnPrimary =
    "px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition-colors";

  function ProgressBar({
    done,
    target,
    label,
  }: {
    done: number;
    target: number;
    label: string;
  }) {
    const pct = target > 0 ? Math.min((done / target) * 100, 100) : 0;
    const color =
      pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400";
    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="text-gray-500">
            {done}/{target}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${color} rounded-full h-3 transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Header title="Generators" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Production Dashboard */}
        {tab === "production" && (
          <div className="space-y-6">
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Daily Quotas
              </h3>
              {production ? (
                <>
                  <ProgressBar
                    done={production.daily.cartoons.done}
                    target={production.daily.cartoons.target}
                    label="Cartoons"
                  />
                  <ProgressBar
                    done={production.daily.podcasts.done}
                    target={production.daily.podcasts.target}
                    label="Podcasts"
                  />
                  <ProgressBar
                    done={production.daily.shorts.done}
                    target={production.daily.shorts.target}
                    label="Shorts"
                  />
                </>
              ) : (
                <p className="text-muted text-sm">Loading...</p>
              )}
            </div>
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Weekly Quotas
              </h3>
              {production ? (
                <ProgressBar
                  done={production.weekly.episodes.done}
                  target={production.weekly.episodes.target}
                  label="Episodes"
                />
              ) : (
                <p className="text-muted text-sm">Loading...</p>
              )}
            </div>
            <div className="bg-card-bg rounded-xl border border-card-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Monthly Quotas
              </h3>
              {production ? (
                <>
                  <ProgressBar
                    done={production.monthly.novels.done}
                    target={production.monthly.novels.target}
                    label="Novels"
                  />
                  <ProgressBar
                    done={production.monthly.workbooks.done}
                    target={production.monthly.workbooks.target}
                    label="Workbooks"
                  />
                  <ProgressBar
                    done={production.monthly.notebooks.done}
                    target={production.monthly.notebooks.target}
                    label="Notebooks"
                  />
                  <ProgressBar
                    done={production.monthly.episodes.done}
                    target={production.monthly.episodes.target}
                    label="Episodes"
                  />
                </>
              ) : (
                <p className="text-muted text-sm">Loading...</p>
              )}
            </div>
          </div>
        )}

        {/* KDP Metadata */}
        {tab === "metadata" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              KDP Metadata Generator
            </h3>
            <form onSubmit={handleMetadata} className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Book title"
                  className={inputCls}
                  required
                />
                <select
                  value={metaGenre}
                  onChange={(e) => setMetaGenre(e.target.value)}
                  className={inputCls}
                >
                  <option value="romance">Romance</option>
                  <option value="thriller">Thriller</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="children">Children&apos;s</option>
                  <option value="educational">Educational</option>
                </select>
                <input
                  type="text"
                  value={metaTropes}
                  onChange={(e) => setMetaTropes(e.target.value)}
                  placeholder="Tropes (comma-separated)"
                  className={inputCls}
                />
              </div>
              <button type="submit" className={btnPrimary} disabled={metaLoading}>
                {metaLoading ? "Generating..." : "Generate Metadata"}
              </button>
            </form>

            {metaResult && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Title Options
                  </h4>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {metaResult.title_options.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Subtitles</h4>
                  <ul className="list-disc pl-5 text-sm text-gray-600">
                    {metaResult.subtitle_options.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {metaResult.keywords.map((k, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    Categories
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {metaResult.categories.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Blurb</h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {metaResult.blurb}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Novel Outline */}
        {tab === "novel" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Romance Novel Outline Generator
            </h3>
            <form onSubmit={handleOutline} className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={novelTitle}
                  onChange={(e) => setNovelTitle(e.target.value)}
                  placeholder="Novel title"
                  className={inputCls}
                  required
                />
                <select
                  value={novelTrope}
                  onChange={(e) => setNovelTrope(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select trope</option>
                  {tropes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={novelProtag}
                  onChange={(e) => setNovelProtag(e.target.value)}
                  placeholder="Protagonist name"
                  className={inputCls}
                />
                <input
                  type="text"
                  value={novelLI}
                  onChange={(e) => setNovelLI(e.target.value)}
                  placeholder="Love interest name"
                  className={inputCls}
                />
              </div>
              <input
                type="text"
                value={novelSetting}
                onChange={(e) => setNovelSetting(e.target.value)}
                placeholder="Setting (e.g., small town in Georgia)"
                className={`${inputCls} w-full`}
              />
              <button
                type="submit"
                className={btnPrimary}
                disabled={outlineLoading}
              >
                {outlineLoading ? "Generating..." : "Generate 20-Chapter Outline"}
              </button>
            </form>

            {outlineResult && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    Romance Beat Sheet
                  </h4>
                  <div className="grid gap-2">
                    {outlineResult.beat_sheet.map((b, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2 bg-pink-50 rounded"
                      >
                        <span className="text-xs font-bold text-pink-600 bg-pink-100 rounded px-2 py-1 shrink-0">
                          Ch {b.chapter}
                        </span>
                        <div>
                          <span className="font-medium text-sm text-gray-800">
                            {b.beat}
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            — {b.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    20-Chapter Outline
                  </h4>
                  <div className="space-y-3">
                    {outlineResult.chapters.map((ch) => (
                      <div
                        key={ch.chapter_number}
                        className="p-3 bg-gray-50 rounded-lg border-l-4 border-primary"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary">
                            Chapter {ch.chapter_number}
                          </span>
                          <span className="text-xs text-gray-400">
                            POV: {ch.pov}
                          </span>
                          <span className="text-xs text-gray-400">
                            {ch.conflict}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{ch.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workbook */}
        {tab === "workbook" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Workbook Generator
            </h3>
            <p className="text-sm text-muted mb-4">
              Generates 10 units with 10-15 worksheets each, plus exit tickets
              and answer key structure.
            </p>
            <form onSubmit={handleWorkbook} className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={wbSubject}
                  onChange={(e) => setWbSubject(e.target.value)}
                  className={inputCls}
                >
                  <option value="reading">Reading</option>
                  <option value="math">Math</option>
                  <option value="science">Science</option>
                  <option value="art">Art</option>
                  <option value="cte">CTE</option>
                  <option value="health">Health</option>
                </select>
                <select
                  value={wbGrade}
                  onChange={(e) => setWbGrade(e.target.value)}
                  className={inputCls}
                >
                  {[
                    "Pre-K",
                    "Kindergarten",
                    "1st Grade",
                    "2nd Grade",
                    "3rd Grade",
                    "4th Grade",
                    "5th Grade",
                    "6th Grade",
                    "7th Grade",
                    "8th Grade",
                  ].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={wbTitle}
                  onChange={(e) => setWbTitle(e.target.value)}
                  placeholder="Custom title (optional)"
                  className={inputCls}
                />
              </div>
              <button type="submit" className={btnPrimary} disabled={wbLoading}>
                {wbLoading ? "Generating..." : "Generate Workbook Structure"}
              </button>
            </form>

            {wbResult && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800">
                    {wbResult.title}
                  </h4>
                  <p className="text-sm text-green-600">
                    {wbResult.grade_level} — {wbResult.subject} —{" "}
                    {wbResult.units.length} units
                  </p>
                </div>
                {wbResult.units.map((unit) => (
                  <details
                    key={unit.unit_number}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <summary className="font-medium text-gray-800 cursor-pointer">
                      {unit.title} ({unit.worksheets.length} worksheets)
                    </summary>
                    <div className="mt-3 space-y-2">
                      {unit.worksheets.map((ws) => (
                        <div
                          key={ws.worksheet_number}
                          className="flex items-center gap-3 text-sm pl-4"
                        >
                          <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                            {ws.type}
                          </span>
                          <span className="text-gray-700">{ws.title}</span>
                        </div>
                      ))}
                      <div className="mt-2 pl-4 text-sm text-orange-600 font-medium">
                        Exit Ticket: {unit.exit_ticket.title} (
                        {unit.exit_ticket.questions} questions)
                      </div>
                    </div>
                  </details>
                ))}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-1">
                    Answer Key
                  </h4>
                  <p className="text-sm text-yellow-700">
                    {wbResult.answer_key_summary}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tropes */}
        {tab === "tropes" && (
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Romance Trope Library
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tropes.map((trope) => (
                <div
                  key={trope}
                  className="p-4 bg-pink-50 border border-pink-200 rounded-lg text-center"
                >
                  <span className="text-sm font-medium text-pink-800">
                    {trope}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {tab === "conflicts" && (
          <div className="space-y-6">
            {conflicts &&
              (
                Object.entries(conflicts) as [
                  string,
                  string[],
                ][]
              ).map(([type, items]) => (
                <div
                  key={type}
                  className="bg-card-bg rounded-xl border border-card-border p-6"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-3 capitalize">
                    {type} Conflicts
                  </h3>
                  <ul className="space-y-2">
                    {items.map((c: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-red-400 mt-0.5">&#x2694;</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            {!conflicts && (
              <p className="text-muted text-sm">Loading conflicts...</p>
            )}
          </div>
        )}

        {/* Plot Twists */}
        {tab === "twists" && (
          <div className="space-y-6">
            {plotTwists &&
              Object.entries(plotTwists).map(([chapter, twists]) => (
                <div
                  key={chapter}
                  className="bg-card-bg rounded-xl border border-card-border p-6"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-3">
                    {chapter.replace("_", " ").replace("chapter", "Chapter ")}
                  </h3>
                  <ul className="space-y-2">
                    {twists.map((twist: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
                      >
                        <span className="text-amber-500 mt-0.5">&#x26A1;</span>
                        {twist}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            {!plotTwists && (
              <p className="text-muted text-sm">Loading plot twists...</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}
