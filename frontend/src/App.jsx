import { useState } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Grid,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  Box,
  Stack,
  CircularProgress,
  Chip,
} from "@mui/material";

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

const yearsRange = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const YEARS = yearsRange(2005, 2025);

const toNumberOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function NumericTextField({ label, name, value, onChange, placeholder, required = false }) {
  const handle = (e) => {
    const raw = e.target.value;
    if (raw === "" || /^[0-9]+$/.test(raw)) {
      onChange({ target: { name, value: raw } });
    }
  };
  return (
    <TextField
      label={label}
      name={name}
      value={value}
      onChange={handle}
      placeholder={placeholder}
      fullWidth
      required={required}
      inputMode="numeric"
      onWheel={(e) => e.currentTarget.blur()}
    />
  );
}

const theme = createTheme({
  palette: { mode: "dark" },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: { styleOverrides: { root: { border: "1px solid rgba(255,255,255,0.1)" } } },
  },
});

const initial = {
  video_views: "",
  uploads: "",
  video_views_for_the_last_30_days: "",
  subscribers_for_last_30_days: "",
  created_year: "",
  category: "",
  country: "",
  channel_type: "",
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

  const fillPreset = (p) => {
    const presets = {
      small: {
        video_views: "25000",
        uploads: "40",
        video_views_for_the_last_30_days: "3000",
        subscribers_for_last_30_days: "120",
        created_year: "2022",
        category: "Education",
        country: "US",
        channel_type: "Creator",
      },
      mid: {
        video_views: "12000000",
        uploads: "400",
        video_views_for_the_last_30_days: "850000",
        subscribers_for_last_30_days: "12000",
        created_year: "2017",
        category: "Entertainment",
        country: "US",
        channel_type: "Creator",
      },
      big: {
        video_views: "850000000",
        uploads: "2500",
        video_views_for_the_last_30_days: "35000000",
        subscribers_for_last_30_days: "500000",
        created_year: "2014",
        category: "Music",
        country: "India",
        channel_type: "Brand",
      },
    };
    setForm(presets[p]);
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
      category: (form.category || "").trim(),
      country: (form.country || "").trim(),
      channel_type: (form.channel_type || "").trim(),
    };

    try {
      const resp = await fetch(`${apiBase}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const details = [
          data?.error,
          data?.missing?.length ? `missing: ${data.missing.join(", ")}` : "",
          data?.problems?.length ? `problems: ${data.problems.join(", ")}` : "",
        ].filter(Boolean).join(" | ");
        setError(details || "Request failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" mb={2}>
          <Typography variant="h4" fontWeight={700}>YouTube Subscriber Predictor</Typography>
          <Typography variant="body2" color="text.secondary">
            API: <code>{apiBase}</code>
          </Typography>
        </Stack>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2}>
              <Typography variant="subtitle1" color="text.secondary">Presets:</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label="Small channel" onClick={() => fillPreset("small")} variant="outlined" />
                <Chip label="Mid channel" onClick={() => fillPreset("mid")} variant="outlined" />
                <Chip label="Big channel" onClick={() => fillPreset("big")} variant="outlined" />
              </Stack>
            </Stack>

            <Box component="form" noValidate onSubmit={onSubmit}>
              <Typography variant="h6" gutterBottom>Required</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <NumericTextField
                    required
                    label="Total Video Views"
                    name="video_views"
                    value={form.video_views}
                    onChange={onChange}
                    placeholder="e.g. 28368841870"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <NumericTextField
                    required
                    label="Uploads"
                    name="uploads"
                    value={form.uploads}
                    onChange={onChange}
                    placeholder="e.g. 741"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <NumericTextField
                    required
                    label="Views (last 30 days)"
                    name="video_views_for_the_last_30_days"
                    value={form.video_views_for_the_last_30_days}
                    onChange={onChange}
                    placeholder="e.g. 1348000000"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <NumericTextField
                    required
                    label="Subscribers (last 30 days)"
                    name="subscribers_for_last_30_days"
                    value={form.subscribers_for_last_30_days}
                    onChange={onChange}
                    placeholder="e.g. 8000000"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="created-label">Created Year</InputLabel>
                    <Select
                      labelId="created-label"
                      label="Created Year"
                      name="created_year"
                      value={form.created_year}
                      onChange={onChange}
                    >
                      {YEARS.map((y) => (
                        <MenuItem key={y} value={String(y)}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="category-label">Category</InputLabel>
                    <Select
                      labelId="category-label"
                      label="Category"
                      name="category"
                      value={form.category}
                      onChange={onChange}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="country-label">Country</InputLabel>
                    <Select
                      labelId="country-label"
                      label="Country"
                      name="country"
                      value={form.country}
                      onChange={onChange}
                    >
                      {COUNTRY_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel id="type-label">Channel Type</InputLabel>
                    <Select
                      labelId="type-label"
                      label="Channel Type"
                      name="channel_type"
                      value={form.channel_type}
                      onChange={onChange}
                    >
                      {CHANNEL_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} mt={3}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} /> : null}
                >
                  {loading ? "Predicting..." : "Predict"}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => { setForm(initial); setResult(null); setError(""); }}
                >
                  Reset
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {result && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Prediction</Typography>
              <Typography variant="h3" fontWeight={800} gutterBottom>
                {result.predicted_subscribers?.toLocaleString?.() ?? result.predicted_subscribers}
              </Typography>
              {result.was_clamped && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Note: output was clamped ({result.clamp_reason})
                </Typography>
              )}
              <Box component="pre" sx={{ whiteSpace: "pre-wrap", m: 0 }}>
                {JSON.stringify(result, null, 2)}
              </Box>
            </CardContent>
          </Card>
        )}
      </Container>
    </ThemeProvider>
  );
}
