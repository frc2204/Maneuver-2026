import { useMemo } from "react";
import { ScoutingEntryBase } from "@/types/scouting-entry";
import { StrategyConfig, AggregationType, ColumnFilter, TeamData } from "@/core/types/strategy";

// Helper keys for standard aggregations
const getNumericValue = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    return 0;
};

// Generic aggregation function
const calculateAggregation = (values: number[], type: AggregationType): number => {
    if (values.length === 0) return 0;
    switch (type) {
        case "average":
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        case "median": {
            const sorted = [...values].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const val1 = sorted[mid - 1];
            const val2 = sorted[mid];
            return sorted.length % 2 === 0 && val1 !== undefined && val2 !== undefined
                ? (val1 + val2) / 2
                : (val2 ?? 0);
        }
        case "max":
            return Math.max(...values);
        case "75th": {
            const sorted = [...values].sort((a, b) => a - b);
            const index = Math.ceil(sorted.length * 0.75) - 1;
            return sorted[Math.max(0, index)] ?? 0;
        }
        default:
            return 0;
    }
};

/**
 * Deeply get a value from an object using a dot-notated key
 * or by checking common phase prefixes (auto, teleop, endgame)
 */
const getDeepValue = (obj: any, key: string): any => {
    if (!obj) return undefined;

    // Direct match
    if (obj[key] !== undefined) return obj[key];

    // Check nested in gameData phases if match is not direct
    if (obj.auto && obj.auto[key] !== undefined) return obj.auto[key];
    if (obj.teleop && obj.teleop[key] !== undefined) return obj.teleop[key];
    if (obj.endgame && obj.endgame[key] !== undefined) return obj.endgame[key];

    // Try dot notation if key has it
    if (key.includes('.')) {
        return key.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
    }

    return undefined;
};

export const useTeamStatistics = (
    filteredData: ScoutingEntryBase[],
    config: StrategyConfig,
    aggregationType: AggregationType,
    columnFilters: Record<string, ColumnFilter>
) => {
    const teamStats = useMemo(() => {
        const teamMap = new Map<string, ScoutingEntryBase[]>();

        // Group by Team + Event
        filteredData.forEach(entry => {
            const teamNumber = entry.teamNumber;
            const eventKey = entry.eventKey;
            if (!teamNumber || !eventKey) return;

            const key = `${teamNumber}_${eventKey}`;
            if (!teamMap.has(key)) teamMap.set(key, []);
            teamMap.get(key)!.push(entry);
        });

        const stats: TeamData[] = [];

        teamMap.forEach((entries, key) => {
            const [teamStr, event] = key.split('_');
            const teamNumber = parseInt(teamStr || "0");

            const teamRow: TeamData = {
                teamNumber,
                eventName: event || "Unknown",
                matchCount: entries.length
            };

            // Calculate metrics based on config
            config.columns.forEach(col => {
                if (["teamNumber", "eventName", "matchCount"].includes(col.key)) return;

                // 1. Check if it's a calculated aggregate
                if (config.aggregates && config.aggregates[col.key]) {
                    const calc = config.aggregates[col.key];
                    if (calc) {
                        const values = entries.map(e => calc(e.gameData));
                        teamRow[col.key] = calculateAggregation(values, aggregationType);
                    }
                }
                // 2. Check if it's a direct numeric value
                else if (col.numeric) {
                    const values = entries.map(e => {
                        return getNumericValue(getDeepValue(e.gameData, col.key));
                    });
                    teamRow[col.key] = calculateAggregation(values, aggregationType);
                }
                // 3. Boolean/Percentage columns
                else if (col.percentage) {
                    const trueCount = entries.filter(e => getDeepValue(e.gameData, col.key) === true).length;
                    teamRow[col.key] = (trueCount / entries.length) * 100;
                }
            });

            stats.push(teamRow);
        });

        return stats.sort((a, b) => a.teamNumber - b.teamNumber);
    }, [filteredData, config, aggregationType]);

    // Apply filtering
    const filteredTeamStats = useMemo(() => {
        if (Object.keys(columnFilters).length === 0) return teamStats;

        return teamStats.filter(team => {
            return Object.entries(columnFilters).every(([key, filter]) => {
                const val = team[key];
                if (typeof val !== 'number') return true;

                switch (filter.operator) {
                    case ">": return val > filter.value;
                    case ">=": return val >= filter.value;
                    case "<": return val < filter.value;
                    case "<=": return val <= filter.value;
                    case "=": return Math.abs(val - filter.value) < 0.001;
                    case "!=": return Math.abs(val - filter.value) >= 0.001;
                    default: return true;
                }
            });
        });

    }, [teamStats, columnFilters]);

    return { teamStats, filteredTeamStats };
};
