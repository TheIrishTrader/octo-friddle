import { useState } from "react";
import { Link } from "react-router-dom";
import { useList } from "@/hooks/useList";

export default function ListPage() {
  const { activeList, isLoading, addItem, toggleItem, removeItem } = useList();
  const [newItem, setNewItem] = useState("");

  const handleAddItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    addItem({ customName: trimmed, addedVia: "manual" });
    setNewItem("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAddItem();
  };

  const items = activeList?.items ?? [];
  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Grocery List</h1>
        <p className="page-subtitle">
          {items.length} item{items.length !== 1 ? "s" : ""}
          {checked.length > 0 ? ` \u00B7 ${checked.length} done` : ""}
        </p>
      </div>

      <div className="input-group">
        <input
          className="input"
          type="text"
          placeholder="Add an item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={handleAddItem} disabled={!newItem.trim()}>
          Add
        </button>
      </div>

      <div className="quick-actions">
        <Link to="/scan" className="quick-action-btn">
          <svg viewBox="0 0 24 24"><path d="M4 6h2V4H4c-1.1 0-2 .9-2 2v2h2V6zm2 12H4v-2H2v2c0 1.1.9 2 2 2h2v-2zm12-12h2v2h2V6c0-1.1-.9-2-2-2h-2v2zm2 12h-2v2h2c1.1 0 2-.9 2-2v-2h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z"/></svg>
          Scan Barcode
        </Link>
        <Link to="/scan" className="quick-action-btn">
          <svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
          Photo
        </Link>
        <Link to="/scan" className="quick-action-btn">
          <svg viewBox="0 0 24 24"><path d="M18 2.01L6 2c-1.1 0-2 .89-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.11-.9-1.99-2-1.99zM18 20H6v-3h12v3zm0-5H6V4h12v11z"/></svg>
          Fridge Scan
        </Link>
      </div>

      <div className="list-items">
        {unchecked.map((item) => (
          <div key={item.id} className="list-item">
            <div
              className="list-item-checkbox"
              onClick={() => toggleItem(item.id)}
            />
            <div className="list-item-content">
              <div className="list-item-name">{item.customName}</div>
              <div className="list-item-meta">
                {item.brand && <span>{item.brand}</span>}
                {item.category && <span>{item.category}</span>}
                {item.addedVia === "barcode" && <span>Scanned</span>}
              </div>
            </div>
            <button className="list-item-delete" onClick={() => removeItem(item.id)}>
              &times;
            </button>
          </div>
        ))}

        {checked.map((item) => (
          <div key={item.id} className="list-item checked">
            <div
              className="list-item-checkbox checked"
              onClick={() => toggleItem(item.id)}
            />
            <div className="list-item-content">
              <div className="list-item-name">{item.customName}</div>
            </div>
            <button className="list-item-delete" onClick={() => removeItem(item.id)}>
              &times;
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">&#x1F6D2;</div>
          <div className="empty-state-text">Your list is empty</div>
          <div className="empty-state-hint">Add items above or scan barcodes to get started</div>
        </div>
      )}
    </div>
  );
}
