"use client";

import { useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { api } from "@/lib/api";
import type { WatchlistItem, TradeLogEntry } from "@/lib/api";
import Header from "@/components/Header";
import { useSidebar } from "../layout";

export default function AnalyticsPage() {
  const { toggleSidebar } = useSidebar();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [trades, setTrades] = useState<TradeLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"watchlist" | "trades" | "sports">("watchlist");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.getWatchlist(token).then(setWatchlist);
    api.getTrades(token).then(setTrades);
  }, []);

  return (
    <>
      <Header title="Investing & Sports Analytics" onMenuToggle={toggleSidebar} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Watchlist Items</p>
            <p className="text-3xl font-bold text-primary">{watchlist.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Total Trades</p>
            <p className="text-3xl font-bold text-warning">{trades.length}</p>
          </div>
          <div className="bg-card-bg rounded-xl border border-card-border p-6">
            <p className="text-sm text-muted mb-1">Trade Volume</p>
            <p className="text-3xl font-bold text-success">
              ${trades.reduce((sum, t) => sum + t.price * t.quantity, 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-card-bg rounded-xl border border-card-border">
          <div className="flex border-b border-card-border">
            {(["watchlist", "trades", "sports"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
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
              <div className="text-center py-12">
                <p className="text-muted mb-2">Sports Analytics Engine</p>
                <p className="text-sm text-muted">
                  Worldwide sports breakdowns, odds analysis, and parlay concepts will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
