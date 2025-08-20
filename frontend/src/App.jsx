import { useMemo, useState } from "react";

/* ---------- dropdown options ---------- */
const CATEGORY_OPTIONS = [
  "Entertainment", "Music", "Gaming", "Education", "Sports", "People & Blogs",
  "Film & Animation", "Howto & Style", "News & Politics", "Shows", "Comedy",
  "Science & Technology", "Travel & Events", "Autos & Vehicles"
];

const CHANNEL_TYPE_OPTIONS = [
  "Creator", "Brand", "Music", "Entertainment", "Education", "Sports", "Media"
];

const COUNTRY_OPTIONS = [
  "US", "India", "UK", "Canada", "Germany", "France", "Brazil", "Japan", "South Korea",
  "Russia", "Australia", "Italy", "Spain", "Netherlands", "Mexico", "Argentina"
];

const yearsRange = (start, end) => {
  const arr = [];
  for (let y = start; y <= end; y++) arr.push(y);
  return arr;
};
const YEARS = yearsRange(2005, 2025);

const toNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function NumericInput({ label, name, value, onChange, placeholder }) {
  const handle = (e) => {
    const raw = e.target.value;
    if (raw === "" || /^[0-9]+$/.test(raw)) {
      onChange({ target: { name, value: raw } });
    }
  };
  return (
    <label className="block mb-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      <input
        className="w-full border rounded px-3 py-2"
        name={name}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handle}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextInput({ label, name, value, onChange, placeholder }) {
  return (
    <label className="block mb-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      <input
        className="w-full border rounded px-3 py-2"
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );
}

function SelectInput({ label, name, value, onChange, options }) {
  return (
    <label className="block mb-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      <select
        className="w-full border rounded px-3 py-2 bg-white text-black"
        name={name}
        value={value}
        onChange={onChange}
      >
        <option value="" disabled>Choose…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

const initial = {
  video_views: "",
  uploads: "",
  video_views_for_the_last_30_days: "",
  subscribers_for_last_30_days: "",
  created_year: "",
  category: "",
  country: "",
  channel_type: "",
  lowest_monthly_earnings: "",
  highest_monthly_earnings: "",
  lowest_yearly_earnings: "",
  highest_yearly_earnings: ""
};

export default function App() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const payload = {
      video_views: toNumberOrNull(form.video_views),
      uploads: toNumberOrNull(form.uploads),
      video_views_for_the_last_30_days: toNumberOrNull(form.video_views_for_the_last_30_days),
      subscribers_for_last_30_days: toNumberOrNull(form.subscribers_for_last_30_days),
      created_year: toNumberOrNull(form.created_year),
      category: form.category.trim(),
      country: form.country.trim(),
      channel_type: form.channel_type.trim(),
      lowest_monthly_earnings: toNumberOrNull(form.lowest_monthly_earnings),
      highest_monthly_earnings: toNumberOrNull(form.highest_monthly_earnings),
      lowest_yearly_earnings: toNumberOrNull(form.lowest_yearly_earnings),
      highest_yearly_earnings: toNumberOrNull(form.highest_yearly_earnings)
    };

    try {
      const resp = await fetch(`${apiBase}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok) setError(data?.error || "Request failed");
      else setResult(data);
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <h1>YouTube Subscriber Predictor</h1>
      <p style={{ color: "#888" }}>
        API: <code>{apiBase}</code>
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <h3>Required</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <NumericInput
            label="Total Video Views"
            name="video_views"
            value={form.video_views}
            onChange={onChange}
            placeholder="e.g. 28368841870"
          />
          <NumericInput
            label="Uploads"
            name="uploads"
            value={form.uploads}
            onChange={onChange}
            placeholder="e.g. 741"
          />
          <NumericInput
            label="Views (last 30 days)"
            name="video_views_for_the_last_30_days"
            value={form.video_views_for_the_last_30_days}
            onChange={onChange}
            placeholder="e.g. 1348000000"
          />
          <NumericInput
            label="Subscribers (last 30 days)"
            name="subscribers_for_last_30_days"
            value={form.subscribers_for_last_30_days}
            onChange={onChange}
            placeholder="e.g. 8000000"
          />

          <SelectInput
            label="Created Year"
            name="created_year"
            value={form.created_year}
            onChange={onChange}
            options={YEARS}
          />
          <SelectInput
            label="Category"
            name="category"
            value={form.category}
            onChange={onChange}
            options={CATEGORY_OPTIONS}
          />
          <SelectInput
            label="Country"
            name="country"
            value={form.country}
            onChange={onChange}
            options={COUNTRY_OPTIONS}
          />
          <SelectInput
            label="Channel Type"
            name="channel_type"
            value={form.channel_type}
            onChange={onChange}
            options={CHANNEL_TYPE_OPTIONS}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #222",
            background: "#222",
            color: "white",
            cursor: "pointer"
          }}
        >
          {loading ? "Predicting..." : "Predict"}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, color: "crimson" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <h3>Prediction</h3>
          <p>
            <strong>Predicted Subscribers:</strong>{" "}
            {result.predicted_subscribers?.toLocaleString?.() ?? result.predicted_subscribers}
          </p>
          {result.was_clamped && (
            <p style={{ color: "#888" }}>Note: output was clamped ({result.clamp_reason}).</p>
          )}
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
