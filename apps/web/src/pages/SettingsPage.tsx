import { useState, useEffect } from "react";
import { usePreferences, useUpdatePreferences } from "@/hooks/usePreferences";

const DIETARY_OPTIONS = [
  "vegetarian", "vegan", "gluten-free", "dairy-free",
  "keto", "organic", "kosher", "halal",
];

const STORE_OPTIONS = [
  "Kroger", "Walmart", "Aldi", "Costco", "Trader Joe's",
  "Whole Foods", "Publix", "Target", "Amazon",
];

export default function SettingsPage() {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();

  const [zipCode, setZipCode] = useState("");
  const [householdSize, setHouseholdSize] = useState(2);
  const [dietary, setDietary] = useState<string[]>([]);
  const [stores, setStores] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (prefs) {
      setZipCode(prefs.zipCode ?? "");
      setHouseholdSize(prefs.householdSize ?? 2);
      setDietary(prefs.dietaryFilters ?? []);
      setStores(prefs.preferredStores ?? []);
    }
  }, [prefs]);

  const handleSave = () => {
    updatePrefs.mutate(
      { zipCode, householdSize, dietaryFilters: dietary, preferredStores: stores },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  const toggleDietary = (item: string) => {
    setDietary((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item],
    );
  };

  const toggleStore = (store: string) => {
    setStores((prev) =>
      prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store],
    );
  };

  if (isLoading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Customize your experience</p>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Location</div>
        <div className="card">
          <div className="setting-row">
            <label>ZIP Code</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 90210"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
            />
          </div>
          <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>
            Used to find stores and prices near you
          </p>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Household</div>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            Household Size
          </div>
          <div className="household-size-selector">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                className={`size-btn ${householdSize === n ? "active" : ""}`}
                onClick={() => setHouseholdSize(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Dietary Preferences</div>
        <div className="card">
          <div className="chip-group">
            {DIETARY_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={`chip ${dietary.includes(opt) ? "active" : ""}`}
                onClick={() => toggleDietary(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Preferred Stores</div>
        <div className="card">
          <div className="chip-group">
            {STORE_OPTIONS.map((store) => (
              <button
                key={store}
                className={`chip ${stores.includes(store) ? "active" : ""}`}
                onClick={() => toggleStore(store)}
              >
                {store}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary btn-block"
        onClick={handleSave}
        disabled={updatePrefs.isPending}
      >
        {updatePrefs.isPending ? "Saving..." : saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
}
