import type { ScoutOptionsState } from "@/types";

export const SCOUT_OPTIONS_STORAGE_KEY = "scoutOptions";

export const GAME_SCOUT_OPTION_KEYS = {
  disableHubFuelScoringPopup: "disableHubFuelScoringPopup",
} as const;

export const GAME_SCOUT_OPTION_DEFAULTS: ScoutOptionsState = {
  [GAME_SCOUT_OPTION_KEYS.disableHubFuelScoringPopup]: false,
};

function coerceScoutOptions(value: unknown): ScoutOptionsState {
  if (!value || typeof value !== "object") return {};

  const result: ScoutOptionsState = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "boolean") {
      result[key] = raw;
    }
  }

  return result;
}

export function readStoredScoutOptions(): ScoutOptionsState {
  const stored = localStorage.getItem(SCOUT_OPTIONS_STORAGE_KEY);
  if (!stored) return {};

  try {
    return coerceScoutOptions(JSON.parse(stored));
  } catch {
    return {};
  }
}

export function getEffectiveScoutOptions(inputOptions?: unknown): ScoutOptionsState {
  return {
    ...GAME_SCOUT_OPTION_DEFAULTS,
    ...readStoredScoutOptions(),
    ...coerceScoutOptions(inputOptions),
  };
}

export function isScoutOptionEnabled(options: ScoutOptionsState, key: string): boolean {
  return options[key] !== false;
}
