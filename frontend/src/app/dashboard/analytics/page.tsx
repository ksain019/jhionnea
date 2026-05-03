"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WatchlistItem, TradeLogEntry, SportsEvent, Parlay } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

export default function AnalyticsPage() {
  const { toggleSidebar } = useSidebar();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [trades, setTrades] = useState<TradeLogEntry[]>([]);
  const [sports, setSports] = useState<SportsEvent[]>([]);
  const [parlays, setParlays] = useState<Parlay[]>([]);
  const [activeTab, setActiveTab] = useState<"watchlist" | "trades" | "sports" | "parlays">("watchlist");
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getWatchlist(token).then(setWatchlist);
    api.getTrades(token).then(setTrades);
    api.getSportsEvents(token).then(setSports).catch(() => {});
    api.getParlays(token).then(setParlays).catch(() => {});
  }, []);

  const handleAddSportsEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const form = e.currentTarget;
    const data = {
      sport: (form.elements.namedItem("sport") as HTMLInputElement).value,
      event_name: (form.elements.namedItem("event_name") as HTMLInputElement).value,
      teams: (form.elements.namedItem("teams") as HTMLInputElement).value,
      event_date: new Date().toISOString(),
      odds_team1: (form.elements.namedItem("odds_team1") as HTMLInputElement).value || undefined,
      odds_team2: (form.elements.namedItem("odds_team2") as HTMLInputElement).value || undefined,
      prediction: (form.elements.namedItem("prediction") as HTMLInputElement).value || undefined,
      confidence: (form.elements.namedItem("confidence") as HTMLSelectElement).value || undefined,
    };
    const event = await api.createSportsEvent(token, data);
    setSports([event, ...sports]);
    setShowAddForm(false);
    form.reset();
  };

  const handleAddParlay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const form = e.currentTarget;
    const legsStr = (form.elements.namedItem("legs") as HTMLTextAreaElement).value;
    const legs = legsStr.split("\n").filter(l => l.trim());
    const data = {
      name: (form.elements.namedItem("parlay_name") as HTMLInputElement).value,
      legs,
      total_odds: (form.elements.namedItem("total_odds") as HTMLInputElement).value || undefined,
      stake: parseFloat((form.elements.namedItem("stake") as HTMLInputElement).value) || undefined,
      potential_payout: parseFloat((form.elements.namedItem("payout") as HTMLInputElement).value) || undefined,
    };
    const parlay = await api.createParlay(token, data);
    setParlays([parlay, ...parlays]);
    setShowAddForm(false);
    form.reset();
  };

  return (
    <>
      <Header title="Investing & Sports Analytics" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Watchlist Items</p>
            <p className="text-3xl font-bold text-primary">{watchlist.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Total Trades</p>
            <p className="text-3xl font-bold text-warning">{trades.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Sports Events</p>
            <p className="text-3xl font-bold text-success">{sports.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Active Parlays</p>
            <p className="text-3xl font-bold text-purple-600">{parlays.filter(p => p.status === "pending").length}</p>
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-card-border">
          <div className="flex border-b border-card-border overflow-x-auto">
            {(["watchlist", "trades", "sports", "parlays"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setShowAddForm(false); }}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "watchlist" && (
              <>
                {watchlist.length === 0 ? (
                  <p className="text-muted text-sm">No items in watchlist. Add stocks, ETFs, or crypto to track.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b border-gray-200">
                          <th className="pb-3 font-medium">Symbol</th>
                          <th className="pb-3 font-medium">Name</th>
                          <th className="pb-3 font-medium">Type</th>
                          <th className="pb-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {watchlist.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 font-mono font-semibold text-primary">{item.symbol}</td>
                            <td className="py-3 text-foreground">{item.name}</td>
                            <td className="py-3 capitalize text-muted">{item.asset_type}</td>
                            <td className="py-3 text-muted">{item.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "trades" && (
              <>
                {trades.length === 0 ? (
                  <p className="text-muted text-sm">No trade logs yet. Record your trades to track performance.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b border-gray-200">
                          <th className="pb-3 font-medium">Symbol</th>
                          <th className="pb-3 font-medium">Action</th>
                          <th className="pb-3 font-medium">Qty</th>
                          <th className="pb-3 font-medium">Price</th>
                          <th className="pb-3 font-medium">Total</th>
                          <th className="pb-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => (
                          <tr key={trade.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 font-mono font-semibold text-foreground">{trade.symbol}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                trade.action === "buy" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {trade.action.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 text-muted">{trade.quantity}</td>
                            <td className="py-3 text-muted">${trade.price.toFixed(2)}</td>
                            <td className="py-3 font-medium text-foreground">
                              ${(trade.price * trade.quantity).toFixed(2)}
                            </td>
                            <td className="py-3 text-muted">{new Date(trade.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "sports" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted">Sports events with odds analysis</p>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary/90">
                    + New Event
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddSportsEvent} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input name="sport" placeholder="Sport (NFL, NBA, MLB...)" required className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="event_name" placeholder="Event name" required className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="teams" placeholder="Teams (Team A vs Team B)" required className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="prediction" placeholder="Prediction" className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="odds_team1" placeholder="Odds Team 1 (e.g. -150)" className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="odds_team2" placeholder="Odds Team 2 (e.g. +130)" className="border rounded-lg px-3 py-2 text-sm" />
                      <select name="confidence" className="border rounded-lg px-3 py-2 text-sm">
                        <option value="">Confidence Level</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm">Create Event</button>
                  </form>
                )}

                {sports.length === 0 ? (
                  <p className="text-center py-8 text-muted text-sm">No sports events yet. Add events to track odds and predictions.</p>
                ) : (
                  <div className="space-y-3">
                    {sports.map((event) => (
                      <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">{event.sport}</span>
                            <h4 className="font-medium mt-1">{event.event_name}</h4>
                            <p className="text-sm text-muted">{event.teams}</p>
                          </div>
                          <div className="text-right text-sm">
                            {event.odds_team1 && <p className="text-muted">Odds: {event.odds_team1} / {event.odds_team2}</p>}
                            {event.prediction && <p className="text-primary font-medium">{event.prediction}</p>}
                            {event.confidence && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                event.confidence === "high" ? "bg-green-100 text-green-700" :
                                event.confidence === "medium" ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              }`}>{event.confidence} confidence</span>
                            )}
                          </div>
                        </div>
                        {event.result && <p className="text-sm mt-2 text-success font-medium">Result: {event.result}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "parlays" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted">Parlay bets and multi-leg analysis</p>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700">
                    + New Parlay
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddParlay} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <input name="parlay_name" placeholder="Parlay name" required className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <textarea name="legs" placeholder="Enter each leg on a new line, e.g.:\nNFL: Chiefs -3.5\nNBA: Lakers ML\nMLB: Yankees Over 8.5" rows={4} required className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <div className="grid grid-cols-3 gap-3">
                      <input name="total_odds" placeholder="Total odds (e.g. +650)" className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="stake" type="number" step="0.01" placeholder="Stake ($)" className="border rounded-lg px-3 py-2 text-sm" />
                      <input name="payout" type="number" step="0.01" placeholder="Potential payout ($)" className="border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm">Create Parlay</button>
                  </form>
                )}

                {parlays.length === 0 ? (
                  <p className="text-center py-8 text-muted text-sm">No parlays yet. Create multi-leg bets to track.</p>
                ) : (
                  <div className="space-y-3">
                    {parlays.map((parlay) => {
                      let legs: string[] = [];
                      try { legs = JSON.parse(parlay.legs); } catch { legs = [parlay.legs]; }
                      return (
                        <div key={parlay.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{parlay.name}</h4>
                              <div className="mt-2 space-y-1">
                                {legs.map((leg, i) => (
                                  <p key={i} className="text-sm text-muted flex items-center gap-2">
                                    <span className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                                    {leg}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                parlay.status === "won" ? "bg-green-100 text-green-700" :
                                parlay.status === "lost" ? "bg-red-100 text-red-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>{parlay.status}</span>
                              {parlay.total_odds && <p className="text-sm text-primary mt-1">{parlay.total_odds}</p>}
                              {parlay.stake && <p className="text-sm text-muted">Stake: ${parlay.stake.toFixed(2)}</p>}
                              {parlay.potential_payout && <p className="text-sm font-medium text-success">Payout: ${parlay.potential_payout.toFixed(2)}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
