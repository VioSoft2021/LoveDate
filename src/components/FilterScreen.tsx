import React from 'react';
import './FilterScreen.css';
import type { Filters } from '../App';
import type { AppLanguage } from '../domain';
import { UI_TEXT, initialFilters } from '../constants';

export interface FilterScreenProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  cityOptions: string[];
  /** Kept for backwards-compat; gender options are now a fixed list. */
  genderOptions?: string[];
  /** Kept for backwards-compat; relationship goals are now a fixed list. */
  relationshipGoalOptions?: string[];
  /** Kept for backwards-compat; redesign no longer surfaces zodiac filter. */
  ZODIAC_EMOJI?: Record<string, string>;
  appLanguage: AppLanguage;
  /** Live count of profiles passing the current filters (the deck length).
   *  Powers the "X matches" indicator so the user sees immediate feedback
   *  as they adjust sliders. Passed in from App.tsx (filteredProfiles.length). */
  matchCount: number;
}

// AI-First filter redesign (2026-05-21). The previous form-style screen
// had 10 controls (zodiac, min/max age, city, interest text, gender,
// looking-for, distance, sort-by, verified-only) which felt clinical and
// duplicated work the E3 Sonnet match-scorer already does. This rewrite:
//   1. Adds a free-text "What are you looking for?" prompt that flows
//      into the E3 Edge Function as viewerPreference — Claude weights the
//      score and shapes the reasoning around it.
//   2. Drops zodiac / city / interest / sort-by / verified-only (AI
//      handles these naturally, and verified-only had ~zero verified
//      profiles to filter against).
//   3. Replaces the two age <input type="number"> with a dual-handle
//      slider (rendered as two stacked HTML range inputs with min/max
//      bounding logic).
//   4. Shows a live "X matches" counter so the user knows their effect
//      immediately, instead of navigating back to Discover to find out.
//   5. Adds a single "Reset all" action.
export const FilterScreen: React.FC<FilterScreenProps> = ({
  filters,
  setFilters,
  appLanguage,
  matchCount,
}) => {
  const copy = UI_TEXT[appLanguage];
  const f = copy.filters;
  const ro = appLanguage === 'ro';

  const setMinAge = (next: number) => {
    const bounded = Math.max(18, Math.min(99, next));
    setFilters((current) => ({
      ...current,
      minAge: Math.min(bounded, current.maxAge),
    }));
  };
  const setMaxAge = (next: number) => {
    const bounded = Math.max(18, Math.min(99, next));
    setFilters((current) => ({
      ...current,
      maxAge: Math.max(bounded, current.minAge),
    }));
  };

  // Goal options shown as segmented buttons. "Any" comes first so the
  // default selection (relationshipGoal === 'any') maps to the first
  // pill — feels natural and emphasizes openness.
  const goalOptions: Array<{ value: Filters['relationshipGoal']; label: string }> = [
    { value: 'any', label: f.goalAny },
    { value: 'Long-term', label: f.goalLongTerm },
    { value: 'Short-term', label: f.goalShortTerm },
    { value: 'Friends', label: f.goalFriends },
    { value: 'Figuring it out', label: f.goalFiguringItOut },
  ];

  const genderOptions: Array<{ value: Filters['gender']; label: string }> = [
    { value: 'any', label: f.genderAny },
    { value: 'woman', label: f.genderWoman },
    { value: 'man', label: f.genderMan },
    { value: 'non-binary', label: f.genderNonBinary },
  ];

  return (
    <div className="filter-screen filter-screen--ai">
      <header className="filter-screen-head">
        <h1>{f.title}</h1>
        <p className="filter-match-count" aria-live="polite">
          <strong>{matchCount}</strong>{' '}
          {matchCount === 1 ? f.matchCountOne : f.matchCount}
        </p>
      </header>

      <section className="filters filters--ai" aria-label={f.title}>
        {/* ── 1. AI HERO — the protagonist of this screen ─────────────
           The free-text prompt threads into E3 Sonnet as viewerPreference;
           Claude factors it into the score and the displayed reasons.
           Visually elevated above the constraints below to signal that
           the AI does the heavy lifting, not the toggles. */}
        <div className="filter-ai-hero">
          <p className="filter-ai-eyebrow" aria-hidden="true">
            <span className="filter-ai-pulse" />
            <span className="filter-ai-eyebrow-brand">{f.aiEyebrow}</span>
            <span className="filter-ai-eyebrow-sep">·</span>
            <span className="filter-ai-eyebrow-state">{f.aiEyebrowState}</span>
          </p>
          <label className="filter-field filter-field--prompt">
            <span className="filter-field-label filter-field-label--hero">
              {f.aiPromptLabel}
            </span>
            <textarea
              className="filter-prompt-input"
              rows={3}
              placeholder={f.aiPromptPlaceholder}
              value={filters.aiPreferencePrompt}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  aiPreferencePrompt: event.target.value,
                }))
              }
              maxLength={400}
            />
            <span className="filter-field-hint">{f.aiPromptHint}</span>
          </label>
        </div>

        {/* ── Constraints group — the hard filters live below the AI hero
           so it's visually obvious that these are secondary. */}
        <div className="filter-constraints">
        <p className="filter-constraints-eyebrow">{f.hardConstraints}</p>

        {/* ── 2. Looking-for segmented row ─────────────────────────── */}
        <fieldset className="filter-field filter-field--segments">
          <legend className="filter-field-label">{f.lookingFor}</legend>
          <div className="filter-segments" role="radiogroup">
            {goalOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={filters.relationshipGoal === opt.value}
                className={
                  filters.relationshipGoal === opt.value
                    ? 'filter-segment is-active'
                    : 'filter-segment'
                }
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    relationshipGoal: opt.value,
                  }))
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── 3. Gender segmented row ──────────────────────────────── */}
        <fieldset className="filter-field filter-field--segments">
          <legend className="filter-field-label">{f.gender}</legend>
          <div className="filter-segments" role="radiogroup">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={filters.gender === opt.value}
                className={
                  filters.gender === opt.value
                    ? 'filter-segment is-active'
                    : 'filter-segment'
                }
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    gender: opt.value,
                  }))
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        {/* ── 4. Age range — dual-handle (two stacked range inputs) ─── */}
        <div className="filter-field filter-field--range">
          <div className="filter-field-label-row">
            <span className="filter-field-label">{f.ageRange}</span>
            <span className="filter-range-value">
              {filters.minAge} – {filters.maxAge}
            </span>
          </div>
          <div className="filter-range-pair">
            <input
              type="range"
              min={18}
              max={99}
              step={1}
              value={filters.minAge}
              onChange={(event) => setMinAge(Number(event.target.value))}
              aria-label={f.minAge}
            />
            <input
              type="range"
              min={18}
              max={99}
              step={1}
              value={filters.maxAge}
              onChange={(event) => setMaxAge(Number(event.target.value))}
              aria-label={f.maxAge}
            />
          </div>
        </div>

        {/* ── 5. Distance ─────────────────────────────────────────── */}
        <div className="filter-field filter-field--range">
          <div className="filter-field-label-row">
            <span className="filter-field-label">{f.maxDistance}</span>
            <span className="filter-range-value">{filters.maxDistanceKm} km</span>
          </div>
          <input
            type="range"
            min={2}
            max={60}
            step={1}
            value={filters.maxDistanceKm}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                maxDistanceKm: Number(event.target.value),
              }))
            }
            aria-label={f.maxDistance}
          />
        </div>

        </div>
        {/* ── 6. Reset all ────────────────────────────────────────── */}
        <button
          type="button"
          className="filter-reset-all"
          onClick={() => setFilters(initialFilters)}
        >
          {f.resetAll}
        </button>
      </section>

      {/* Screen-reader-only summary of what was dropped from the previous
          filter screen — explains why "Verified Only" / "Zodiac" / "Sort By"
          are gone, in case a returning user looks for them. */}
      <p className="filter-screen-rationale">
        {ro
          ? 'Filtrul de zodie a fost eliminat — Privé AI o ia în calcul automat.'
          : 'Zodiac filter removed — Privé AI factors it automatically.'}
      </p>
    </div>
  );
};
