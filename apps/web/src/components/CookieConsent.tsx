import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Preferences = { necessary: true; functional: boolean; analytics: boolean; marketing: boolean };
type StoredConsent = { version: 1; preferences: Preferences; savedAt: string };
type ConsentContextValue = { functionalEnabled: boolean; openSettings: () => void };

const STORAGE_KEY = "cosmopolitan-cookie-consent";
const defaults: Preferences = { necessary: true, functional: false, analytics: false, marketing: false };
const ConsentContext = createContext<ConsentContextValue | null>(null);

function parseConsent(value: string | null): Preferences | null {
  if (!value) return null;
  try {
    const stored: unknown = JSON.parse(value);
    if (!stored || typeof stored !== "object" || !("version" in stored) || stored.version !== 1 ||
      !("preferences" in stored) || !stored.preferences || typeof stored.preferences !== "object") return null;
    const p = stored.preferences;
    if (!("necessary" in p) || p.necessary !== true ||
      !("functional" in p) || typeof p.functional !== "boolean" ||
      !("analytics" in p) || typeof p.analytics !== "boolean" ||
      !("marketing" in p) || typeof p.marketing !== "boolean") return null;
    return { necessary: true, functional: p.functional, analytics: p.analytics, marketing: p.marketing };
  } catch (error) {
    console.error("Could not read saved cookie preferences.", error);
    return null;
  }
}

function readConsent(): Preferences | null {
  try {
    return parseConsent(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.error("Could not access saved cookie preferences.", error);
    return null;
  }
}

function writeConsent(preferences: Preferences): boolean {
  try {
    const consent: StoredConsent = { version: 1, preferences, savedAt: new Date().toISOString() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    return true;
  } catch (error) {
    console.error("Could not save cookie preferences.", error);
    return false;
  }
}

export function useCookieConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return context;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(readConsent);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    const syncConsent = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setPreferences(parseConsent(event.newValue));
    };
    window.addEventListener("storage", syncConsent);
    return () => window.removeEventListener("storage", syncConsent);
  }, []);
  useEffect(() => {
    if (!preferences?.functional) document.querySelector('script[data-turnstile]')?.remove();
  }, [preferences?.functional]);

  const save = (next: Preferences) => {
    const saved = writeConsent(next);
    setPreferences(next);
    setStorageError(!saved);
    setSettingsOpen(!saved);
  };
  const openSettings = () => setSettingsOpen(true);

  return (
    <ConsentContext.Provider value={{ functionalEnabled: preferences?.functional === true, openSettings }}>
      {children}
      {(!preferences || settingsOpen) && (
        <CookieConsent
          preferences={preferences}
          showSettings={settingsOpen}
          storageError={storageError}
          onSave={save}
          onClose={() => setSettingsOpen(false)}
          onCustomize={openSettings}
        />
      )}
    </ConsentContext.Provider>
  );
}

function CookieConsent({
  preferences, showSettings, storageError, onSave, onClose, onCustomize,
}: {
  preferences: Preferences | null;
  showSettings: boolean;
  storageError: boolean;
  onSave: (preferences: Preferences) => void;
  onClose: () => void;
  onCustomize: () => void;
}) {
  const [draft, setDraft] = useState<Preferences>(preferences ?? defaults);
  useEffect(() => setDraft(preferences ?? defaults), [preferences]);
  const update = (key: "functional" | "analytics" | "marketing") =>
    setDraft((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className={`cookie-consent-layer${showSettings ? " is-settings" : ""}`}>
      <section className="cookie-consent-card" aria-label="Cookie preferences" role="dialog" aria-modal={showSettings || undefined}>
        {showSettings && <button type="button" className="cookie-consent-close" onClick={onClose} aria-label="Close cookie settings">×</button>}
        {!showSettings && <h2 className="cookie-consent-title">Your privacy matters</h2>}
        <p className="cookie-consent-copy text-sm leading-6 text-slate-600">
          We use necessary storage to keep this site secure and remember your choice. Optional features are off unless you allow them.{" "}
          <Link to="/cookies" className="font-medium text-brand underline underline-offset-2">Read our Cookie Policy</Link>.
        </p>
        {storageError && <p role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-5 text-amber-950">Your choice applies for this visit, but this browser could not save it. Check your browser storage settings and try saving again.</p>}
        {!showSettings && !preferences && (
          <div className="cookie-consent-actions">
            <button type="button" className="cookie-consent-primary" onClick={() => onSave({ necessary: true, functional: true, analytics: true, marketing: true })}>Accept All</button>
            <button type="button" className="cookie-consent-secondary" onClick={() => onSave(defaults)}>Reject Optional</button>
            <button type="button" className="cookie-consent-secondary" onClick={onCustomize}>Customize Preferences</button>
          </div>
        )}
        {showSettings && (
          <>
            <h2 className="mt-4 font-heading text-xl font-bold text-navy">Cookie preferences</h2>
            <div className="mt-3 divide-y divide-slate-100">
              <PreferenceRow title="Necessary" description="Required for site security and remembering your preferences." checked disabled onChange={() => {}} />
              <PreferenceRow title="Functional" description="Enables the branch map and Cloudflare security check." checked={draft.functional} onChange={() => update("functional")} />
              <PreferenceRow title="Analytics" description="Allows optional measurement of how the site is used. No analytics provider is currently configured." checked={draft.analytics} onChange={() => update("analytics")} />
              <PreferenceRow title="Marketing" description="Allows optional advertising or marketing tools. No marketing provider is currently configured." checked={draft.marketing} onChange={() => update("marketing")} />
            </div>
            <div className="cookie-consent-actions">
              <button type="button" className="cookie-consent-primary" onClick={() => onSave(draft)}>Save Preferences</button>
              <button type="button" className="cookie-consent-secondary" onClick={() => onSave(defaults)}>Reject Optional</button>
              <button type="button" className="cookie-consent-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function PreferenceRow({ title, description, checked, disabled, onChange }: {
  title: string; description: string; checked: boolean; disabled?: boolean; onChange: () => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-navy">{title}{disabled && <span className="ml-2 text-xs font-medium text-slate-500">Always on</span>}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-brand" checked={checked} disabled={disabled} onChange={onChange} />
    </label>
  );
}
