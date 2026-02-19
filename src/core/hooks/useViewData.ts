import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, pitDB } from '@/db';
import type { ScoutingEntryBase } from '@/core/types/scouting-entry';
import type { PitScoutingEntryBase } from '@/core/types/pit-scouting';

export type ViewDataDataset = 'match' | 'pit';

export interface ViewDataFilters {
  eventKey: string;
  teamNumber: string;
  matchNumber: string;
  scoutName: string;
}

export interface ViewDataFilterOptions {
  eventKeys: string[];
  teamNumbers: string[];
  matchNumbers: string[];
  scoutNames: string[];
}

export type MatchViewEntry = ScoutingEntryBase<Record<string, unknown>>;
export type PitViewEntry = PitScoutingEntryBase;

const DEFAULT_FILTERS: ViewDataFilters = {
  eventKey: 'all',
  teamNumber: '',
  matchNumber: '',
  scoutName: '',
};

const sortByTimestampDesc = <T extends { timestamp: number }>(entries: T[]): T[] => {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp);
};

export function useViewData() {
  const [dataset, setDataset] = useState<ViewDataDataset>('match');
  const [filters, setFilters] = useState<ViewDataFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [matchEntries, setMatchEntries] = useState<MatchViewEntry[]>([]);
  const [pitEntries, setPitEntries] = useState<PitViewEntry[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (dataset === 'match') {
        const entries = await db.scoutingData.orderBy('timestamp').reverse().toArray();
        setMatchEntries(entries as MatchViewEntry[]);
      } else {
        const entries = await pitDB.pitScoutingData.orderBy('timestamp').reverse().toArray();
        setPitEntries(entries);
      }
    } catch (loadError) {
      console.error('[useViewData] Failed to load entries:', loadError);
      setError('Failed to load data entries.');
    } finally {
      setLoading(false);
    }
  }, [dataset]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeEntries = useMemo(() => {
    return dataset === 'match' ? matchEntries : pitEntries;
  }, [dataset, matchEntries, pitEntries]);

  const filterOptions = useMemo<ViewDataFilterOptions>(() => {
    const eventKeys = [...new Set(activeEntries.map((entry) => entry.eventKey).filter(Boolean))].sort();
    const teamNumbers = [...new Set(activeEntries.map((entry) => entry.teamNumber).filter(Boolean))]
      .sort((a, b) => a - b)
      .map(String);
    const scoutNames = [...new Set(activeEntries.map((entry) => entry.scoutName).filter(Boolean))].sort();

    const matchNumbers = dataset === 'match'
      ? [...new Set((activeEntries as MatchViewEntry[]).map((entry) => entry.matchNumber).filter(Boolean))]
        .sort((a, b) => a - b)
        .map(String)
      : [];

    return {
      eventKeys,
      teamNumbers,
      matchNumbers,
      scoutNames,
    };
  }, [activeEntries, dataset]);

  const filteredEntries = useMemo(() => {
    const normalizedScoutSearch = filters.scoutName.trim().toLowerCase();

    if (dataset === 'match') {
      let entries = activeEntries as MatchViewEntry[];

      if (filters.eventKey && filters.eventKey !== 'all') {
        entries = entries.filter((entry) => entry.eventKey === filters.eventKey);
      }

      if (filters.teamNumber.trim()) {
        entries = entries.filter((entry) => String(entry.teamNumber) === filters.teamNumber.trim());
      }

      if (filters.matchNumber.trim()) {
        entries = entries.filter((entry) => String(entry.matchNumber) === filters.matchNumber.trim());
      }

      if (normalizedScoutSearch) {
        entries = entries.filter((entry) => entry.scoutName.toLowerCase().includes(normalizedScoutSearch));
      }

      return sortByTimestampDesc(entries);
    }

    let entries = activeEntries as PitViewEntry[];

    if (filters.eventKey && filters.eventKey !== 'all') {
      entries = entries.filter((entry) => entry.eventKey === filters.eventKey);
    }

    if (filters.teamNumber.trim()) {
      entries = entries.filter((entry) => String(entry.teamNumber) === filters.teamNumber.trim());
    }

    if (normalizedScoutSearch) {
      entries = entries.filter((entry) => entry.scoutName.toLowerCase().includes(normalizedScoutSearch));
    }

    return sortByTimestampDesc(entries);
  }, [activeEntries, dataset, filters]);

  const updateFilter = useCallback(<K extends keyof ViewDataFilters>(key: K, value: ViewDataFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...DEFAULT_FILTERS,
      matchNumber: dataset === 'pit' ? '' : prev.matchNumber,
    }));
  }, [dataset]);

  const setDatasetWithReset = useCallback((nextDataset: ViewDataDataset) => {
    setDataset(nextDataset);
    setFilters((prev) => ({
      ...prev,
      matchNumber: nextDataset === 'pit' ? '' : prev.matchNumber,
    }));
  }, []);

  return {
    dataset,
    setDataset: setDatasetWithReset,
    filters,
    updateFilter,
    resetFilters,
    loading,
    error,
    filterOptions,
    filteredEntries,
    totalEntries: activeEntries.length,
    refresh,
  };
}
