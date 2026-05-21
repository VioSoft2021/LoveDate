import React from 'react';
import './FilterScreen.css';
import type { Filters } from '../App';
import type { AppLanguage } from '../domain';
import { UI_TEXT } from '../constants';

export interface FilterScreenProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  cityOptions: string[];
  /** Kept for backwards-compat; gender options are now a fixed list. */
  genderOptions?: string[];
  /** Kept for backwards-compat; relationship goals are now a fixed list. */
  relationshipGoalOptions?: string[];
  ZODIAC_EMOJI: Record<string, string>;
  appLanguage: AppLanguage;
}

export const FilterScreen: React.FC<FilterScreenProps> = ({
  filters,
  setFilters,
  cityOptions,
  // genderOptions / relationshipGoalOptions are accepted but no longer used —
  // the deck-derived lists hid options for genders that hadn't yet been
  // loaded. We now render fixed lists matching the schema CHECK constraints.
  ZODIAC_EMOJI,
  appLanguage,
}) => {
  const copy = UI_TEXT[appLanguage];
  const f = copy.filters;
  const any = copy.common.any;
  return (
    <div className="filter-screen">
      <h1>{f.title}</h1>
      <section className="filters" aria-label={f.title}>
        <label>
          {f.zodiacCompatibility}
          <select
            value={filters.zodiacCompatibility}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                zodiacCompatibility: event.target.value,
              }))
            }
          >
            <option value="">{any}</option>
            {Object.keys(ZODIAC_EMOJI).map((sign) => (
              <option key={sign} value={sign}>
                {sign} {ZODIAC_EMOJI[sign]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {f.minAge}
          <input
            type="number"
            min={18}
            max={99}
            value={filters.minAge}
            onChange={(event) => {
              const requested = Number(event.target.value);
              const safeRequested = Number.isFinite(requested) ? requested : 18;
              const bounded = Math.max(18, Math.min(99, safeRequested));
              setFilters((current) => ({
                ...current,
                minAge: Math.min(bounded, current.maxAge),
              }));
            }}
          />
        </label>
        <label>
          {f.maxAge}
          <input
            type="number"
            min={18}
            max={99}
            value={filters.maxAge}
            onChange={(event) => {
              const requested = Number(event.target.value);
              const safeRequested = Number.isFinite(requested) ? requested : 60;
              const bounded = Math.max(18, Math.min(99, safeRequested));
              setFilters((current) => ({
                ...current,
                maxAge: Math.max(bounded, current.minAge),
              }));
            }}
          />
        </label>
        <label>
          {f.city}
          <select
            value={filters.city}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
          >
            <option value="">{any}</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          {f.interest}
          <input
            type="text"
            placeholder={f.interestPlaceholder}
            value={filters.interest}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                interest: event.target.value,
              }))
            }
          />
        </label>
        <label>
          {f.gender}
          <select
            value={filters.gender}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                gender: event.target.value as Filters['gender'],
              }))
            }
          >
            <option value="any">{any}</option>
            <option value="woman">{f.genderWoman}</option>
            <option value="man">{f.genderMan}</option>
            <option value="non-binary">{f.genderNonBinary}</option>
          </select>
        </label>
        <label>
          {f.lookingFor}
          <select
            value={filters.relationshipGoal}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                relationshipGoal: event.target.value as Filters['relationshipGoal'],
              }))
            }
          >
            <option value="any">{any}</option>
            <option value="Long-term">{f.goalLongTerm}</option>
            <option value="Short-term">{f.goalShortTerm}</option>
            <option value="Friends">{f.goalFriends}</option>
            <option value="Figuring it out">{f.goalFiguringItOut}</option>
          </select>
        </label>
        <label>
          {f.maxDistance}
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
          />
          <span>{filters.maxDistanceKm} km</span>
        </label>
        <label>
          {f.sortBy}
          <select
            value={filters.sortBy}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sortBy: event.target.value as Filters['sortBy'],
              }))
            }
          >
            <option value="recommended">{f.sortRecommended}</option>
            <option value="nearest">{f.sortNearest}</option>
            <option value="youngest">{f.sortYoungest}</option>
            <option value="oldest">{f.sortOldest}</option>
          </select>
        </label>
        <label className="toggle">
          {f.verifiedOnly}
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                verifiedOnly: event.target.checked,
              }))
            }
          />
        </label>
      </section>
    </div>
  );
};
