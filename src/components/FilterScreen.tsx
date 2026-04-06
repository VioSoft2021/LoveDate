import React from 'react';
import './FilterScreen.css';
import type { Filters } from '../App';

export interface FilterScreenProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  includeReviewed: boolean;
  setIncludeReviewed: (v: boolean) => void;
  cityOptions: string[];
  genderOptions: string[];
  relationshipGoalOptions: string[];
  ZODIAC_EMOJI: Record<string, string>;
}

export const FilterScreen: React.FC<FilterScreenProps> = ({
  filters,
  setFilters,
  includeReviewed,
  setIncludeReviewed,
  cityOptions,
  genderOptions,
  relationshipGoalOptions,
  ZODIAC_EMOJI,
}) => {
  return (
    <div className="filter-screen">
      <h1>Filters</h1>
      <section className="filters" aria-label="Profile filters">
        {/* All filter controls, same as before */}
        <label>
          Zodiac Compatibility
          <select
            value={filters.zodiacCompatibility}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                zodiacCompatibility: event.target.value,
              }))
            }
          >
            <option value="">Any</option>
            {Object.keys(ZODIAC_EMOJI).map((sign) => (
              <option key={sign} value={sign}>
                {sign} {ZODIAC_EMOJI[sign]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min Age
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
          Max Age
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
          City
          <select
            value={filters.city}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                city: event.target.value,
              }))
            }
          >
            <option value="">Any</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
        <label>
          Interest
          <input
            type="text"
            placeholder="e.g. brunch"
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
          Sex
          <select
            value={filters.gender}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                gender: event.target.value as Filters['gender'],
              }))
            }
          >
            <option value="any">Any</option>
            {genderOptions.includes('Woman') && <option value="woman">Woman</option>}
            {genderOptions.includes('Man') && <option value="man">Man</option>}
            {genderOptions.includes('Non-binary') && <option value="non-binary">Non-binary</option>}
          </select>
        </label>
        <label>
          Looking For
          <select
            value={filters.relationshipGoal}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                relationshipGoal: event.target.value as Filters['relationshipGoal'],
              }))
            }
          >
            <option value="any">Any</option>
            {relationshipGoalOptions.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
        </label>
        <label>
          Max Distance (km)
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
          Sort By
          <select
            value={filters.sortBy}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sortBy: event.target.value as Filters['sortBy'],
              }))
            }
          >
            <option value="recommended">Recommended</option>
            <option value="nearest">Nearest</option>
            <option value="youngest">Youngest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
        <label className="toggle">
          Verified Only
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
        <label className="toggle">
          Include Reviewed
          <input
            type="checkbox"
            checked={includeReviewed}
            onChange={(event) => setIncludeReviewed(event.target.checked)}
          />
        </label>
      </section>
    </div>
  );
};
