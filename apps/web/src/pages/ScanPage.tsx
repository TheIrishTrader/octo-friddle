import { useState, useRef, useEffect, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useList } from "@/hooks/useList";

type ScanMode = null | "barcode" | "photo" | "fridge" | "receipt";

interface BarcodeProduct {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  barcode: string;
}

async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  // Try UPCitemdb first (covers most US retail products including alcohol)
  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
    if (res.ok) {
      const data = await res.json();
      if (data.items?.length > 0) {
        const item = data.items[0];
        return {
          name: item.title ?? item.description ?? "Unknown",
          brand: item.brand,
          category: item.category,
          imageUrl: item.images?.[0],
          barcode: code,
        };
      }
    }
  } catch {
    // fall through
  }

  // Open Food Facts (good for groceries, international products)
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return {
          name: p.product_name ?? p.generic_name ?? "Unknown",
          brand: p.brands,
          category: p.categories?.split(",")[0]?.trim(),
          imageUrl: p.image_front_small_url,
          barcode: code,
        };
      }
    }
  } catch {
    // fall through
  }

  // Open Beauty Facts (cosmetics, personal care)
  try {
    const res = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${code}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return {
          name: p.product_name ?? p.generic_name ?? "Unknown",
          brand: p.brands,
          category: p.categories?.split(",")[0]?.trim() ?? "Personal Care",
          imageUrl: p.image_front_small_url,
          barcode: code,
        };
      }
    }
  } catch {
    // fall through
  }

  // Open Pet Food Facts
  try {
    const res = await fetch(`https://world.openpetfoodfacts.org/api/v2/product/${code}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 1 && data.product) {
        const p = data.product;
        return {
          name: p.product_name ?? p.generic_name ?? "Unknown",
          brand: p.brands,
          category: p.categories?.split(",")[0]?.trim() ?? "Pet Food",
          imageUrl: p.image_front_small_url,
          barcode: code,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "looking_up" | "found" | "not_found" | "added" | "error">("idle");
  const [message, setMessage] = useState("");
  const [foundProduct, setFoundProduct] = useState<BarcodeProduct | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { addItem } = useList();

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    await stopScanner();

    setStatus("scanning");
    setMessage("");
    setFoundProduct(null);

    await new Promise((r) => setTimeout(r, 150));

    const el = document.getElementById("barcode-scanner");
    if (!el) return;

    const scanner = new Html5Qrcode("barcode-scanner");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 150 }, aspectRatio: 1.5 },
        async (decodedText) => {
          try { await scanner.stop(); } catch { /* ignore */ }
          scannerRef.current = null;

          setStatus("looking_up");
          setMessage(`Barcode: ${decodedText}`);

          const product = await lookupBarcode(decodedText);
          if (product) {
            setFoundProduct(product);
            setStatus("found");
          } else {
            setFoundProduct({ name: decodedText, barcode: decodedText });
            setStatus("not_found");
            setMessage(`Barcode ${decodedText} not found in product databases`);
          }
        },
        () => { /* no barcode in frame */ },
      );
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error && err.message.includes("Permission")
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Could not start camera. Try the manual entry below.",
      );
    }
  }, [stopScanner]);

  useEffect(() => {
    if (mode === "barcode" && status === "idle") {
      startScanner();
    }
    return () => { stopScanner(); };
  }, [mode]); // startScanner/stopScanner are stable callbacks

  const handleAddToList = () => {
    if (!foundProduct) return;
    addItem({
      customName: foundProduct.brand
        ? `${foundProduct.name} (${foundProduct.brand})`
        : foundProduct.name,
      brand: foundProduct.brand,
      category: foundProduct.category,
      imageUrl: foundProduct.imageUrl,
      barcode: foundProduct.barcode,
      addedVia: "barcode",
    });
    setStatus("added");
    setMessage(`${foundProduct.name} added to your list!`);
  };

  const handleScanAnother = () => {
    setFoundProduct(null);
    setStatus("idle");
    setMessage("");
    startScanner();
  };

  const handleManualLookup = async (code: string) => {
    await stopScanner();
    setStatus("looking_up");
    setMessage(`Looking up ${code}...`);
    const product = await lookupBarcode(code);
    if (product) {
      setFoundProduct(product);
      setStatus("found");
    } else {
      setFoundProduct({ name: code, barcode: code });
      setStatus("not_found");
      setMessage(`Barcode ${code} not found in product databases`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("error");
    setMessage("Photo/receipt scanning requires the API backend. Barcode scanning works now!");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleBack = async () => {
    await stopScanner();
    setMode(null);
    setStatus("idle");
    setMessage("");
    setFoundProduct(null);
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
            {/* Camera - always mounted, hidden when showing results */}
            <div style={{ display: (status === "idle" || status === "scanning") ? "block" : "none" }}>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div id="barcode-scanner" style={{ width: "100%", minHeight: 280 }} />
              </div>
              <p style={{ fontSize: 13, color: "var(--gray-400)", textAlign: "center", marginTop: 8 }}>
                Point your camera at a barcode
              </p>
            </div>

            {/* Looking up */}
            {status === "looking_up" && (
              <div className="card" style={{ textAlign: "center", padding: 32 }}>
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontSize: 15, fontWeight: 500 }}>Looking up barcode...</div>
                <div style={{ fontSize: 13, color: "var(--gray-400)", marginTop: 4 }}>{message}</div>
              </div>
            )}

            {/* Product found */}
            {status === "found" && foundProduct && (
              <div className="card" style={{ textAlign: "center", padding: 24 }}>
                {foundProduct.imageUrl && (
                  <img
                    src={foundProduct.imageUrl}
                    alt={foundProduct.name}
                    style={{ width: 96, height: 96, objectFit: "contain", borderRadius: 12, margin: "0 auto 12px", display: "block", background: "var(--gray-50)" }}
                  />
                )}
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--gray-900)" }}>{foundProduct.name}</div>
                {foundProduct.brand && (
                  <div style={{ fontSize: 14, color: "var(--gray-500)", marginTop: 4 }}>{foundProduct.brand}</div>
                )}
                {foundProduct.category && (
                  <div style={{ display: "inline-block", padding: "2px 10px", background: "var(--green-50)", color: "var(--green-700)", borderRadius: 12, fontSize: 12, fontWeight: 500, marginTop: 8 }}>
                    {foundProduct.category}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8 }}>Barcode: {foundProduct.barcode}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleAddToList}>Add to List</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleScanAnother}>Scan Another</button>
                </div>
              </div>
            )}

            {/* Not found - let user type a name */}
            {status === "not_found" && (
              <NotFoundCard
                barcode={foundProduct?.barcode ?? ""}
                message={message}
                onAdd={(name) => {
                  addItem({ customName: name, barcode: foundProduct?.barcode, addedVia: "barcode" });
                  setStatus("added");
                  setMessage(`${name} added to your list!`);
                }}
                onScanAnother={handleScanAnother}
              />
            )}

            {/* Added confirmation */}
            {status === "added" && (
              <div className="card" style={{ textAlign: "center", padding: 24 }}>
                <div style={{ fontSize: 40, marginBottom: 8, color: "var(--green-500)" }}>&#10003;</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--green-700)" }}>{message}</div>
                <button className="btn btn-primary btn-block" style={{ marginTop: 20 }} onClick={handleScanAnother}>Scan Another</button>
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="status-error" style={{ marginTop: 12 }}>{message}</div>
            )}

            {/* Manual entry */}
            {(["idle", "scanning", "error"].includes(status)) && (
              <div className="card" style={{ marginTop: 16 }}>
                <label className="input-label">Or type barcode manually</label>
                <ManualBarcodeInput onSubmit={handleManualLookup} disabled={false} />
              </div>
            )}
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
                <span style={{ fontSize: 12, color: "var(--gray-400)" }}>Tap to open camera or select file</span>
                <input ref={fileRef} className="file-upload-input" type="file" accept="image/*" capture="environment" onChange={handleFileUpload} />
              </label>
            </div>
            {status === "error" && (
              <div className="status-error" style={{ marginTop: 12 }}>{message}</div>
            )}
          </div>
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

function NotFoundCard({ barcode, message, onAdd, onScanAnother }: {
  barcode: string;
  message: string;
  onAdd: (name: string) => void;
  onScanAnother: () => void;
}) {
  const [customName, setCustomName] = useState("");

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>?</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--gray-700)" }}>Product Not Found</div>
        <div style={{ fontSize: 13, color: "var(--gray-500)", marginTop: 4 }}>{message}</div>
      </div>
      <div style={{ marginTop: 16 }}>
        <label className="input-label">Name this item to add it</label>
        <div className="input-group">
          <input
            className="input"
            type="text"
            placeholder="e.g. Corona Premier 24pk"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customName.trim()) onAdd(customName.trim());
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => { if (customName.trim()) onAdd(customName.trim()); }}
            disabled={!customName.trim()}
          >
            Add
          </button>
        </div>
        <div style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>Barcode: {barcode}</div>
      </div>
      <button className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={onScanAnother}>
        Scan Another Instead
      </button>
    </div>
  );
}

function ManualBarcodeInput({ onSubmit, disabled }: { onSubmit: (code: string) => void; disabled: boolean }) {
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
          if (e.key === "Enter" && value.trim()) { onSubmit(value.trim()); setValue(""); }
        }}
        inputMode="numeric"
      />
      <button
        className="btn btn-primary"
        onClick={() => { if (value.trim()) { onSubmit(value.trim()); setValue(""); } }}
        disabled={!value.trim() || disabled}
      >
        Lookup
      </button>
    </div>
  );
}
