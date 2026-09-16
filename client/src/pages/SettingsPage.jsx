import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../context/SettingsContext.jsx";
import { updateSettings } from "../api/settings.js";
import { SEVERITIES } from "../constants/bugs.js";

const THEMES = ["light", "dark", "system"];
const PAGE_SIZES = [10, 20, 50, 100];

function getTimezoneOptions() {
  if (typeof Intl.supportedValuesOf === "function") {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      // fall through to the single-option fallback below
    }
  }
  return [Intl.DateTimeFormat().resolvedOptions().timeZone];
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function SettingsPage() {
  const { settings, loading, setSettings } = useSettings();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const browserTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const timezoneOptions = useMemo(() => {
    const options = getTimezoneOptions();
    return options.includes(browserTimezone) ? options : [browserTimezone, ...options];
  }, [browserTimezone]);

  useEffect(() => {
    if (settings && !form) {
      setForm({
        theme: settings.theme,
        default_severity_for_new_bugs: settings.default_severity_for_new_bugs,
        default_page_size: settings.default_page_size,
        timezone: settings.timezone || browserTimezone,
        auto_generate_report_after_run: settings.auto_generate_report_after_run,
      });
    }
  }, [settings, form, browserTimezone]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await updateSettings(form);
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <main className="page">
        <h1>Settings</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="settings-form">
        <section className="settings-group">
          <h3>Appearance</h3>
          <label>
            Theme
            <select value={form.theme} onChange={(e) => update("theme", e.target.value)}>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-group">
          <h3>Bugs</h3>
          <label>
            Default severity for new bugs
            <select
              value={form.default_severity_for_new_bugs}
              onChange={(e) => update("default_severity_for_new_bugs", e.target.value)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-group">
          <h3>Lists</h3>
          <label>
            Default page size
            <select value={form.default_page_size} onChange={(e) => update("default_page_size", Number(e.target.value))}>
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-group">
          <h3>Locale</h3>
          <label>
            Timezone
            <select value={form.timezone} onChange={(e) => update("timezone", e.target.value)}>
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="settings-group">
          <h3>Automation</h3>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={form.auto_generate_report_after_run}
              onChange={(e) => update("auto_generate_report_after_run", e.target.checked)}
            />
            Automatically generate a report after a test run completes
          </label>
        </section>

        {error && <p className="form-error">{error}</p>}
        {saved && !error && <p className="form-success">Settings saved.</p>}

        <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default SettingsPage;
