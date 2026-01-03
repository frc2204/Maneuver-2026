import { useState, useMemo, useEffect } from "react";
import { useTeamStatistics } from "@/core/hooks/useTeamStatistics";
import { useChartData } from "@/core/hooks/useChartData";
import { strategyConfig } from "@/game/strategy-config";
import { StrategyHeader } from "@/core/components/Strategy/StrategyHeader";
import { StrategyChart } from "@/core/components/Strategy/StrategyChart";
import { TeamStatsTableEnhanced } from "@/core/components/Strategy/TeamStatsTableEnhanced";
import { loadScoutingData } from "@/core/lib/scoutingDataUtils";
import { ScoutingEntryBase } from "@/types/scouting-entry";
import { AggregationType, ColumnFilter, FilterOperator } from "@/core/types/strategy";

export default function StrategyOverviewPage() {
    const [scoutingData, setScoutingData] = useState<ScoutingEntryBase[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<string>("all");
    const [aggregationType, setAggregationType] = useState<AggregationType>("average");
    const [chartType, setChartType] = useState<"bar" | "scatter" | "box" | "stacked">("bar");
    const [chartMetric, setChartMetric] = useState<string>(strategyConfig.columns[0]?.key || "totalPoints");
    const [scatterXMetric, setScatterXMetric] = useState<string>(strategyConfig.columns[0]?.key || "teamNumber");
    const [scatterYMetric, setScatterYMetric] = useState<string>(strategyConfig.columns[1]?.key || "totalPoints");

    const [columnConfig, setColumnConfig] = useState(strategyConfig.columns);
    const [columnFilters, setColumnFilters] = useState<Record<string, ColumnFilter>>({});
    const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

    // Load data on mount
    useEffect(() => {
        const fetchData = async () => {
            const data = await loadScoutingData();
            setScoutingData(data);
        };
        fetchData();

        // Load saved settings from localStorage
        const savedAggregation = localStorage.getItem("strategy_aggregation");
        if (savedAggregation) setAggregationType(savedAggregation as AggregationType);

        const savedChartType = localStorage.getItem("strategy_chartType");
        if (savedChartType) setChartType(savedChartType as any);

        const savedChartMetric = localStorage.getItem("strategy_chartMetric");
        if (savedChartMetric) setChartMetric(savedChartMetric);

        const savedColumnFilters = localStorage.getItem("strategy_columnFilters");
        if (savedColumnFilters) {
            try {
                setColumnFilters(JSON.parse(savedColumnFilters));
            } catch (e) {
                console.error("Failed to parse saved column filters", e);
            }
        }

        const savedVisibleColumns = localStorage.getItem("strategy_visibleColumns");
        if (savedVisibleColumns) {
            try {
                const visibleKeys = JSON.parse(savedVisibleColumns) as string[];
                setColumnConfig(prev => prev.map(col => ({
                    ...col,
                    visible: visibleKeys.includes(col.key)
                })));
            } catch (e) {
                console.error("Failed to parse saved visible columns", e);
            }
        }
    }, []);

    // Save settings when they change
    useEffect(() => {
        localStorage.setItem("strategy_aggregation", aggregationType);
    }, [aggregationType]);

    useEffect(() => {
        localStorage.setItem("strategy_chartType", chartType);
    }, [chartType]);

    useEffect(() => {
        localStorage.setItem("strategy_chartMetric", chartMetric);
    }, [chartMetric]);

    useEffect(() => {
        localStorage.setItem("strategy_columnFilters", JSON.stringify(columnFilters));
    }, [columnFilters]);

    useEffect(() => {
        const visibleKeys = columnConfig.filter(col => col.visible).map(col => col.key);
        localStorage.setItem("strategy_visibleColumns", JSON.stringify(visibleKeys));
    }, [columnConfig]);

    // Derived state
    const availableEvents = useMemo(() => {
        return Array.from(new Set(scoutingData.map((d) => d.eventKey))).sort();
    }, [scoutingData]);

    const filteredScoutingData = useMemo(() => {
        if (selectedEvent === "all") return scoutingData;
        return scoutingData.filter((d) => d.eventKey === selectedEvent);
    }, [scoutingData, selectedEvent]);

    // Calculate statistics using generic hook
    const { teamStats, filteredTeamStats } = useTeamStatistics(
        filteredScoutingData,
        { ...strategyConfig, columns: columnConfig },
        aggregationType,
        columnFilters
    );

    // Prepare chart data using generic hook
    const { chartData, chartConfig } = useChartData(
        filteredTeamStats,
        chartType,
        chartMetric,
        scatterXMetric,
        scatterYMetric,
        { ...strategyConfig, columns: columnConfig }
    );

    // Handlers
    const handleToggleColumn = (key: string) => {
        setColumnConfig(prev => prev.map(col =>
            col.key === key ? { ...col, visible: !col.visible } : col
        ));
    };

    const handleApplyPreset = (presetKey: string) => {
        const preset = strategyConfig.presets[presetKey];
        if (preset) {
            setColumnConfig(prev => prev.map(col => ({
                ...col,
                visible: preset.includes(col.key)
            })));
        }
    };

    const handleSetColumnFilter = (columnKey: string, operator: FilterOperator, value: number) => {
        setColumnFilters(prev => ({
            ...prev,
            [columnKey]: { operator, value }
        }));
    };

    const handleRemoveColumnFilter = (columnKey: string) => {
        setColumnFilters(prev => {
            const next = { ...prev };
            delete next[columnKey];
            return next;
        });
    };

    const handleClearAllFilters = () => {
        setColumnFilters({});
    };

    return (
        <div className="flex flex-col min-h-screen gap-6 p-4 md:p-8">
            <StrategyHeader
                filteredTeamCount={filteredTeamStats.length}
                totalTeamCount={teamStats.length}
                activeFilterCount={Object.keys(columnFilters).length}
                selectedEvent={selectedEvent}
                onEventChange={setSelectedEvent}
                availableEvents={availableEvents}
                aggregationType={aggregationType}
                onAggregationTypeChange={setAggregationType}
                onClearAllFilters={handleClearAllFilters}
                isSettingsOpen={false} // Placeholder for header settings if needed
                onSettingsOpenChange={() => { }}
                chartType={chartType}
                onChartTypeChange={setChartType}
            />

            <StrategyChart
                chartData={chartData}
                chartType={chartType}
                onChartTypeChange={setChartType}
                chartMetric={chartMetric}
                onChartMetricChange={setChartMetric}
                scatterXMetric={scatterXMetric}
                onScatterXMetricChange={setScatterXMetric}
                scatterYMetric={scatterYMetric}
                onScatterYMetricChange={setScatterYMetric}
                columnConfig={columnConfig}
                chartConfig={chartConfig}
            />

            <TeamStatsTableEnhanced
                teamStats={teamStats}
                filteredTeamStats={filteredTeamStats}
                columnConfig={columnConfig}
                columnFilters={columnFilters}
                onToggleColumn={handleToggleColumn}
                onApplyPreset={handleApplyPreset}
                onSetColumnFilter={handleSetColumnFilter}
                onRemoveColumnFilter={handleRemoveColumnFilter}
                onClearAllFilters={handleClearAllFilters}
                isColumnSettingsOpen={isColumnSettingsOpen}
                onColumnSettingsOpenChange={setIsColumnSettingsOpen}
            />
        </div>
    );
}
