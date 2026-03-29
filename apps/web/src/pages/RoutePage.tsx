import { useState } from "react";
import { useList } from "@/hooks/useList";
import { useOptimalRoute } from "@/hooks/useRoute";

export default function RoutePage() {
  const { activeList } = useList();
  const [maxStops, setMaxStops] = useState(3);

  const { data: route, isLoading } = useOptimalRoute(
    activeList?.id ?? null,
    { maxStops },
  );

  const itemCount = activeList?.items?.length ?? 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Route</h1>
        <p className="page-subtitle">Optimized shopping route</p>
      </div>

      <div className="route-config">
        <div style={{ flex: 1 }}>
          <label className="input-label">Max Stops</label>
          <select
            className="input"
            value={maxStops}
            onChange={(e) => setMaxStops(Number(e.target.value))}
          >
            <option value={1}>1 store</option>
            <option value={2}>2 stores</option>
            <option value={3}>3 stores</option>
          </select>
        </div>
      </div>

      {itemCount === 0 ? (
        <div className="empty-state">
          <div className="empty-state-text">Add items to your list first</div>
          <div className="empty-state-hint">
            We'll find the cheapest route for your groceries
          </div>
        </div>
      ) : isLoading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : !route ? (
        <div className="empty-state">
          <div className="empty-state-text">No route data available</div>
          <div className="empty-state-hint">
            Add items and compare prices first
          </div>
        </div>
      ) : (
        <>
          <div className="route-summary">
            <div className="route-summary-grid">
              <div>
                <div className="route-stat-value">
                  ${route.totalCost.toFixed(2)}
                </div>
                <div className="route-stat-label">Total Cost</div>
              </div>
              <div>
                <div className="route-stat-value">{route.stops.length}</div>
                <div className="route-stat-label">
                  Stop{route.stops.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div>
                <div className="route-stat-value">
                  {route.totalDistance != null
                    ? `${route.totalDistance.toFixed(1)} mi`
                    : "--"}
                </div>
                <div className="route-stat-label">Distance</div>
              </div>
            </div>
            {route.savings > 0 && (
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 14, color: "var(--green-700)" }}>
                Saving ${route.savings.toFixed(2)} vs single store
              </div>
            )}
          </div>

          {route.stops.map((stop, i) => (
            <div key={i} className="stop-card">
              <div className="stop-header">
                <div className="stop-name">
                  {i + 1}. {stop.store.name}
                </div>
                <div className="stop-subtotal">
                  ${stop.subtotal.toFixed(2)}
                </div>
              </div>
              {stop.distanceFromPrevious != null && (
                <div className="stop-meta">
                  {stop.distanceFromPrevious.toFixed(1)} mi away
                </div>
              )}
              <div className="stop-items">
                {stop.items.map((item, j) => (
                  <div key={j} className="stop-item">
                    <span className="stop-item-name">{item.itemName}</span>
                    <span className="stop-item-price">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
