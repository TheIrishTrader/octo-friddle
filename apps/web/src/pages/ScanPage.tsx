import { useState, useRef } from "react";
import { apiClient } from "@/api/client";
import { useList } from "@/hooks/useList";

type ScanMode = null | "barcode" | "photo" | "fridge" | "receipt";

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode>(null);
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { activeList } = useList();

  const handleBarcodeLookup = async () => {
    if (!barcode.trim()) return;
    setStatus("uploading");
    setMessage("Looking up barcode...");
    try {
      await apiClient.post("/scan/barcode", {
        barcode: barcode.trim(),
        listId: activeList?.id,
      });
      setStatus("success");
      setMessage("Item added to your list!");
      setBarcode("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Lookup failed");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (activeList?.id) formData.append("listId", activeList.id);

    setStatus("uploading");

    const endpoint =
      mode === "photo"
        ? "/scan/photo"
        : mode === "fridge"
          ? "/scan/fridge"
          : "/scan/receipt";

    setMessage(
      mode === "receipt" ? "Processing receipt..." : "Analyzing image..."
    );

    try {
      await apiClient.upload(endpoint, formData);
      setStatus("success");
      setMessage(
        mode === "receipt"
          ? "Receipt processed! Items added."
          : "Items detected and added!"
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  if (mode) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-secondary btn-sm" onClick={() => { setMode(null); setStatus("idle"); }}>
            &larr; Back
          </button>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            {mode === "barcode" && "Barcode Lookup"}
            {mode === "photo" && "Photo Scan"}
            {mode === "fridge" && "Fridge Scan"}
            {mode === "receipt" && "Receipt Scan"}
          </h1>
        </div>

        {mode === "barcode" ? (
          <div className="card">
            <label className="input-label">Enter barcode number</label>
            <div className="input-group">
              <input
                className="input"
                type="text"
                placeholder="e.g. 012345678901"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeLookup()}
                inputMode="numeric"
              />
              <button
                className="btn btn-primary"
                onClick={handleBarcodeLookup}
                disabled={!barcode.trim() || status === "uploading"}
              >
                Lookup
              </button>
            </div>
          </div>
        ) : (
          <div className="scan-input-area">
            <div className="card">
              <label className="file-upload-label">
                <svg viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                </svg>
                <span>
                  {mode === "photo" && "Upload a photo of items"}
                  {mode === "fridge" && "Upload a photo of your fridge"}
                  {mode === "receipt" && "Upload a receipt photo"}
                </span>
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>
                  Tap to select a file
                </span>
                <input
                  ref={fileRef}
                  className="file-upload-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>
        )}

        {status === "uploading" && (
          <div className="status-uploading">
            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            {message}
          </div>
        )}
        {status === "success" && (
          <div className="status-success">{message}</div>
        )}
        {status === "error" && (
          <div className="status-error">{message}</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Scan</h1>
        <p className="page-subtitle">Add items by scanning</p>
      </div>

      <div className="scan-grid">
        <div className="scan-card" onClick={() => setMode("barcode")}>
          <div className="scan-card-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M4 6h2V4H4c-1.1 0-2 .9-2 2v2h2V6zm2 12H4v-2H2v2c0 1.1.9 2 2 2h2v-2zm12-12h2v2h2V6c0-1.1-.9-2-2-2h-2v2zm2 12h-2v2h2c1.1 0 2-.9 2-2v-2h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z" />
            </svg>
          </div>
          <div className="scan-card-title">Barcode</div>
          <div className="scan-card-desc">Type or paste a barcode number</div>
        </div>

        <div className="scan-card" onClick={() => setMode("photo")}>
          <div className="scan-card-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
          <div className="scan-card-title">Photo</div>
          <div className="scan-card-desc">Upload a photo of items</div>
        </div>

        <div className="scan-card" onClick={() => setMode("fridge")}>
          <div className="scan-card-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M18 2.01L6 2c-1.1 0-2 .89-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.11-.9-1.99-2-1.99zM18 20H6v-3h12v3zm0-5H6V4h12v11z" />
            </svg>
          </div>
          <div className="scan-card-title">Fridge</div>
          <div className="scan-card-desc">Scan what you already have</div>
        </div>

        <div className="scan-card" onClick={() => setMode("receipt")}>
          <div className="scan-card-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" />
            </svg>
          </div>
          <div className="scan-card-title">Receipt</div>
          <div className="scan-card-desc">Upload a store receipt</div>
        </div>
      </div>
    </div>
  );
}
