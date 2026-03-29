import { useState } from "react";
import { useList } from "@/hooks/useList";
import { useBasketComparison } from "@/hooks/usePrices";
import { useAlerts, useSubstitutions, useDeals } from "@/hooks/useSmart";

export default function PricesPage() {
  const { activeList } = useList();
  const [tab, setTab] = useState<"basket" | "deals" | "alerts" | "subs">("basket");

  const itemIds = (activeList?.items ?? [])
    .filter((i) => i.itemId)
    .map((i) => i.itemId!);

  const { data: basket, isLoading: basketLoading } = useBasketComparison(itemIds);
  const { data: alerts } = useAlerts(activeList?.id ?? null);
  const { data: substitutions } = useSubstitutions(activeList?.id ?? null);
  const { data: deals } = useDeals();

  const sortedStores = [...(basket?.stores ?? [])].sort(
    (a, b) => a.totalPrice - b.totalPrice,
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Prices</h1>
        <p className="page-subtitle">Compare prices across stores</p>
      </div>

      <div className="chip-group" style={{ marginBottom: 16 }}>
        {(["basket", "deals", "alerts", "subs"] as const).map((t) => (
          <button
            key={t}
            className={`chip ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "basket" ? "Basket" : t === "deals" ? "Deals" : t === "alerts" ? "Alerts" : "Swap"}
          </button>
        ))}
      </div>

      {tab === "basket" && (
        <>
          {basketLoading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : itemIds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">Add items to your list to compare prices</div>
            </div>
          ) : (
            <>
              {basket?.splitSuggestion && basket.splitSuggestion.savingsVsBest > 0 && (
                <div className="savings-card">
                  <div className="savings-icon">$</div>
                  <div>
                    <div className="savings-amount">
                      Save ${basket.splitSuggestion.savingsVsBest.toFixed(2)}
                    </div>
                    <div className="savings-label">
                      by splitting across {basket.splitSuggestion.stores.length} stores
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-header">
                  <div className="card-title">Store Totals</div>
                </div>
                {sortedStores.map((s) => (
                  <div key={s.store.id} className="store-total">
                    <div>
                      <div className="store-total-name">{s.store.name}</div>
                      {s.itemsMissing.length > 0 && (
                        <div style={{ fontSize: 12, color: "var(--gray-400)" }}>
                          Missing {s.itemsMissing.length} item{s.itemsMissing.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                    <div className="store-total-amount">
                      ${s.totalPrice.toFixed(2)}
                    </div>
                  </div>
                ))}
                {sortedStores.length === 0 && (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
                    No price data yet. Prices will appear after searching.
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {tab === "deals" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Current Deals</div>
          </div>
          {(deals ?? []).length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
              No deals found right now
            </div>
          ) : (
            (deals ?? []).map((d, i) => (
              <div key={i} className="deal-item">
                <div className="deal-info">
                  <div className="deal-name">{d.itemName}</div>
                  <div className="deal-store">{d.storeName}</div>
                </div>
                <div className="deal-prices">
                  <div className="deal-original">${d.originalPrice.toFixed(2)}</div>
                  <div className="deal-sale">
                    ${d.salePrice.toFixed(2)}
                    <span className="deal-badge">-{d.savingsPercent}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "alerts" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Price Alerts</div>
          </div>
          {(alerts ?? []).length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
              No alerts for your list items
            </div>
          ) : (
            (alerts ?? []).map((a, i) => (
              <div key={i} className="alert-item">
                <div className={`alert-dot ${a.alertType}`} />
                <div>
                  <div className="alert-message">{a.message}</div>
                  <div className="alert-store">{a.storeName}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "subs" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cheaper Alternatives</div>
          </div>
          {(substitutions ?? []).length === 0 ? (
            <div style={{ padding: 16, textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>
              No substitutions found
            </div>
          ) : (
            (substitutions ?? []).map((sub, i) => (
              <SubstitutionGroup key={i} sub={{
                originalItem: sub.originalItemName,
                currentPrice: sub.originalPrice,
                options: sub.suggestions.map((s) => ({
                  name: s.itemName,
                  price: s.price,
                  savings: s.savings,
                  store: s.storeName,
                })),
              }} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SubstitutionGroup({ sub }: { sub: { originalItem: string; currentPrice: number; options: Array<{ name: string; price: number; savings: number; store: string }> } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="substitution-group">
      <div className="substitution-header" onClick={() => setOpen(!open)}>
        <div className="substitution-original">
          {sub.originalItem} - ${sub.currentPrice.toFixed(2)}
        </div>
        <button className="substitution-toggle">
          {sub.options.length} option{sub.options.length !== 1 ? "s" : ""} {open ? "^" : "v"}
        </button>
      </div>
      {open &&
        sub.options.map((opt, j) => (
          <div key={j} className="substitution-option">
            <div>
              <div>{opt.name}</div>
              <div style={{ fontSize: 12, color: "var(--gray-400)" }}>
                at {opt.store}
              </div>
            </div>
            <div>
              <span style={{ marginRight: 8 }}>${opt.price.toFixed(2)}</span>
              <span className="substitution-savings">
                -${opt.savings.toFixed(2)}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}
