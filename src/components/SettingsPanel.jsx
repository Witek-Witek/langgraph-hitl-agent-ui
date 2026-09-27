export function SettingsPanel({ options, profile, persona, onChange, disabled }) {
  if (!options) return null;
  
  const { profiles = [], personas = [], defaults = {} } = options;

  return (
    <div className="settings">
      <label className="settings__field">
        <span>Model</span>
        <select value={profile} onChange={(e) => onChange({ profile: e.target.value })} disabled={disabled}>
          <option value="">Domyślny ({defaults.profile || "—"})</option>
          {profiles.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>

      <label className="settings__field">
        <span>Styl</span>
        <select value={persona} onChange={(e) => onChange({ persona: e.target.value })} disabled={disabled}>
          <option value="">Domyślny ({defaults.persona || "—"})</option>
          {personas.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>
    </div>
  );
}