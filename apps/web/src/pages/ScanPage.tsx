import { useState, useRef, useEffect, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { apiClient } from "@/api/client";
import { useList } from "@/hooks/useList";

type ScanMode = null | "barcode" | "photo" | "fridge" | "receipt";

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<string>("barcode-scanner");
  const { activeList } = useList();

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
  }, []);

  const handleBarcodeScan = useCallback(
    async (code: string) => {
      if (code === lastScanned && status === "success") return;
      setLastScanned(code);
      setStatus("uploading");
      setMessage(`Found barcode: ${code} - Looking up...`);
      try {
        const result = await apiClient.post<{ found: boolean; item: { name?: string; displayName?: string } | null }>(
          "/scan/barcode",
          { barcode: code, listId: activeList?.id },
        );
        if (result.found && result.item) {
          setStatus("success");
          setMessage(`Found: ${result.item.displayName ?? result.item.name}`);
        } else {
          setStatus("error");
          setMessage(`Barcode ${code} not found in any database`);
        }
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Lookup failed");
      }
      // Allow scanning another barcode after 3 seconds
      setTimeout(() => setLastScanned(null), 3000);
    },
    [activeList?.id, lastScanned, status],
  );

  useEffect(() => {
    if (mode !== "barcode") return;

    let cancelled = false;

    const startScanner = async () => {
      // Small delay to ensure DOM element exists
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;

      const scanner = new Html5Qrcode(scannerContainerRef.current);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            handleBarcodeScan(decodedText);
          },
          () => {
            // scan error (no barcode found in frame) - ignore
          },
        );
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            err instanceof Error && err.message.includes("Permission")
              ? "Camera permission denied. Please allow camera access."
              : "Could not start camera. Try the manual entry below.",
          );
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [mode, handleBarcodeScan, stopScanner]);

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
      mode === "receipt" ? "Processing receipt..." : "Analyzing image...",
    );

    try {
      await apiClient.upload(endpoint, formData);
      setStatus("success");
      setMessage(
        mode === "receipt"
          ? "Receipt processed! Items added."
          : "Items detected and added!",
      );
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleBack = async () => {
    await stopScanner();
    setMode(null);
    setStatus("idle");
    setMessage("");
    setLastScanned(null);
  };

  if (mode) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-secondary btn-sm" onClick={handleBack}>
            &larr; Back
          </button>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            {mode === "barcode" && "Barcode Scanner"}
            {mode === "photo" && "Photo Scan"}
            {mode === "fridge" && "Fridge Scan"}
            {mode === "receipt" && "Receipt Scan"}
          </h1>
        </div>

        {mode === "barcode" ? (
          <div>
            {/* Live camera scanner */}
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                id={scannerContainerRef.current}
                style={{ width: "100%", minHeight: 280 }}
              />
            </div>
            <p style={{ fontSize: 13, color: "var(--gray-400)", textAlign: "center", marginTop: 8 }}>
              Point your camera at a barcode
            </p>

            {/* Manual fallback */}
            <div className="card" style={{ marginTop: 16 }}>
              <label className="input-label">Or type barcode manually</label>
              <ManualBarcodeInput
                onSubmit={(code) => handleBarcodeScan(code)}
                disabled={status === "uploading"}
              />
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
                  {mode === "photo" && "Take or upload a photo of items"}
                  {mode === "fridge" && "Take or upload a photo of your fridge"}
                  {mode === "receipt" && "Take or upload a receipt photo"}
                </span>
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>
                  Tap to open camera or select file
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
          <div className="scan-card-desc">Auto-scan with camera</div>
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

function ManualBarcodeInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (code: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="input-group">
      <input
        className="input"
        type="text"
        placeholder="e.g. 012345678901"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value.trim());
            setValue("");
          }
        }}
        inputMode="numeric"
      />
      <button
        className="btn btn-primary"
        onClick={() => {
          if (value.trim()) {
            onSubmit(value.trim());
            setValue("");
          }
        }}
        disabled={!value.trim() || disabled}
      >
        Lookup
      </button>
    </div>
  );
}
