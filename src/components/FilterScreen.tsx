import React from 'react';
import './FilterScreen.css';
import type { Filters } from '../App';
import type { AppLanguage } from '../domain';
import { UI_TEXT, initialFilters } from '../constants';

export interface FilterScreenProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  cityOptions: string[];
  /** Kept for backwards-compat; gender options are now AI-inferred. */
  genderOptions?: string[];
  /** Kept for backwards-compat; relationship goals are now AI-inferred. */
  relationshipGoalOptions?: string[];
  /** Kept for backwards-compat; redesign no longer surfaces zodiac filter. */
  ZODIAC_EMOJI?: Record<string, string>;
  appLanguage: AppLanguage;
  /** Live count of profiles passing the current filters (the deck length).
   *  Powers the "X matches" indicator so the user sees immediate feedback
   *  as they refine their prompt. Passed in from App.tsx (filteredProfiles.length). */
  matchCount: number;
}

// AI-First filter — journal-entry experience (2026-05-25).
// Previous design had a free-text AI prompt PLUS five constraint controls
// (looking-for, gender, age, distance). That contradicted the welcome
// film's promise: "Privé AI does the matching." This rewrite strips the
// constraints — the journal entry IS the filter. Defaults flow through
// the underlying Filters{} so the deck filter logic still runs; AI
// parses the prompt for hard signals (age, gender, location, intent).
export const FilterScreen: React.FC<FilterScreenProps> = ({
  filters,
  setFilters,
  appLanguage,
  matchCount,
}) => {
  const copy = UI_TEXT[appLanguage];
  const f = copy.filters;

  // Localised journal-page date stamp ("25 MAY 2026" / "25 MAI 2026").
  // Uses Intl.DateTimeFormat so the month name follows the user's
  // selected app language, not the browser locale.
  const todayStamp = React.useMemo(() => {
    const now = new Date();
    const locale = appLanguage === 'ro' ? 'ro-RO' : 'en-GB';
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
      .format(now)
      .toUpperCase()
      .replace(/[.,]/g, '');
  }, [appLanguage]);

  return (
    <div className="filter-screen filter-screen--ai filter-screen--journal">
      <header className="filter-screen-head">
        <h1>{f.title}</h1>
        <p className="filter-match-count" aria-live="polite">
          <strong>{matchCount}</strong>{' '}
          {matchCount === 1 ? f.matchCountOne : f.matchCount}
        </p>
      </header>

      <section className="filters filters--ai" aria-label={f.title}>
        {/* AI HERO — the entire filter is now a single journal entry */}
        <div className="filter-ai-hero">
          <div className="filter-journal-marginalia">
            <p className="filter-ai-eyebrow" aria-hidden="true">
              <span className="filter-ai-pulse" />
              <span className="filter-ai-eyebrow-brand">{f.aiEyebrow}</span>
              <span className="filter-ai-eyebrow-sep">·</span>
              <span className="filter-ai-eyebrow-state">{f.aiEyebrowState}</span>
            </p>
            <p className="filter-journal-date" aria-hidden="true">{todayStamp}</p>
          </div>

          <label className="filter-field filter-field--prompt">
            <span className="filter-field-label filter-field-label--hero">
              {f.aiPromptLabel}
            </span>
            <div className="filter-journal-page">
              <span className="filter-journal-rule filter-journal-rule--top" aria-hidden="true" />
              <textarea
                className="filter-prompt-input"
                rows={8}
                placeholder={f.aiPromptPlaceholder}
                value={filters.aiPreferencePrompt}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    aiPreferencePrompt: event.target.value,
                  }))
                }
                maxLength={600}
                autoFocus
              />
              <span className="filter-journal-rule filter-journal-rule--bottom" aria-hidden="true" />
            </div>
            <span className="filter-field-hint">{f.aiPromptHint}</span>
          </label>
        </div>

        <button
          type="button"
          className="filter-reset-all"
          onClick={() => setFilters(initialFilters)}
        >
          {f.resetAll}
        </button>
      </section>
    </div>
  );
};
