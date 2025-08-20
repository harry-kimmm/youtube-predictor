import { useState } from "react";

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

const toNumberOrNull = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
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
      if (!resp.ok) {
        setError(data?.error || "Request failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ label, name, type = "text", placeholder }) => (
    <label className="block mb-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      <input
        className="w-full border rounded px-3 py-2"
        name={name}
        type={type}
        value={form[name]}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  );

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: "0 16px" }}>
      <h1>YouTube Subscriber Predictor</h1>
      <p style={{ color: "#555" }}>
        Enter channel stats to get a predicted subscriber count.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <h3>Required</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Total Video Views" name="video_views" type="number" placeholder="e.g. 28368841870" />
          <Input label="Uploads" name="uploads" type="number" placeholder="e.g. 741" />
          <Input label="Views (last 30 days)" name="video_views_for_the_last_30_days" type="number" placeholder="e.g. 1348000000" />
          <Input label="Subscribers (last 30 days)" name="subscribers_for_last_30_days" type="number" placeholder="e.g. 8000000" />
          <Input label="Created Year" name="created_year" type="number" placeholder="e.g. 2012" />
          <Input label="Category" name="category" placeholder="e.g. Entertainment" />
          <Input label="Country" name="country" placeholder="e.g. US" />
          <Input label="Channel Type" name="channel_type" placeholder="e.g. Creator" />
        </div>

        <h3 style={{ marginTop: 16 }}>Optional (Earnings)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Lowest Monthly Earnings" name="lowest_monthly_earnings" type="number" />
          <Input label="Highest Monthly Earnings" name="highest_monthly_earnings" type="number" />
          <Input label="Lowest Yearly Earnings" name="lowest_yearly_earnings" type="number" />
          <Input label="Highest Yearly Earnings" name="highest_yearly_earnings" type="number" />
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
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
