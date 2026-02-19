import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, RefreshCw } from 'lucide-react';

import { useViewData, type MatchViewEntry, type PitViewEntry } from '@/core/hooks/useViewData';
import { Button } from '@/core/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/core/components/ui/card';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import { Badge } from '@/core/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/ui/select';
import { Skeleton } from '@/core/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/core/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/core/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import { MatchTransferQrContent } from '@/core/components/data-transfer/MatchTransferQr';
import { PitTransferQrContent } from '@/core/components/data-transfer/PitTransferQr';

const PAGE_SIZE = 100;

type FlatPair = {
  key: string;
  value: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const formatPrimitive = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
};

const flattenGameData = (value: unknown, prefix = ''): FlatPair[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenGameData(item, `${prefix}[${index}]`));
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .flatMap((key) => {
        const nextPrefix = prefix ? `${prefix}.${key}` : key;
        return flattenGameData(value[key], nextPrefix);
      });
  }

  if (!prefix) {
    return [];
  }

  return [{ key: prefix, value: formatPrimitive(value) }];
};

const formatTimestamp = (timestamp: number): string => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
};

const MetadataRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-1 items-start gap-0.5 text-sm">
    <span className="text-muted-foreground break-all leading-tight">{label}</span>
    <span className="break-all min-w-0 leading-tight">{value || '—'}</span>
  </div>
);

export default function ViewDataPage() {
  const {
    dataset,
    setDataset,
    filters,
    updateFilter,
    resetFilters,
    loading,
    error,
    filterOptions,
    filteredEntries,
    totalEntries,
    refresh,
  } = useViewData();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'qr' | 'data'>('qr');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelectedEntryId(null);
  }, [dataset, filters.eventKey, filters.teamNumber, filters.matchNumber, filters.scoutName]);

  useEffect(() => {
    if (!selectedEntryId) return;
    setModalTab('qr');
  }, [dataset, selectedEntryId]);

  const hasMore = visibleCount < filteredEntries.length;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredEntries.length));
        }
      },
      {
        root: null,
        rootMargin: '200px 0px',
        threshold: 0,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [filteredEntries.length, hasMore]);

  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);

  const flattenedGameDataById = useMemo(() => {
    const map = new Map<string, FlatPair[]>();

    visibleEntries.forEach((entry) => {
      map.set(entry.id, flattenGameData(entry.gameData));
    });

    return map;
  }, [visibleEntries]);

  const selectedEntry = useMemo(() => {
    if (!selectedEntryId) return null;
    return visibleEntries.find((entry) => entry.id === selectedEntryId) || null;
  }, [selectedEntryId, visibleEntries]);

  const selectedGameDataFields = useMemo(() => {
    if (!selectedEntry) return [];
    return flattenedGameDataById.get(selectedEntry.id) || [];
  }, [flattenedGameDataById, selectedEntry]);

  return (
    <div className="min-h-screen w-full px-4 pt-12 pb-24">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">View Data</h1>
            <p className="text-muted-foreground">
              Browse stored scouting entries with stable framework fields and dynamic game data for each season.
            </p>
          </div>
        </div>

        <Card className="py-4">
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Dataset</CardTitle>
              <CardDescription>Select which stored entries to inspect.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={dataset} onValueChange={(value) => setDataset(value as 'match' | 'pit')}>
                <TabsList>
                  <TabsTrigger value="match">Match Scouting</TabsTrigger>
                  <TabsTrigger value="pit">Pit Scouting</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Badge variant="secondary">{totalEntries} total</Badge>
                <Badge variant="outline">{filteredEntries.length} shown</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label htmlFor="view-data-event-filter">Event</Label>
                <Select value={filters.eventKey} onValueChange={(value) => updateFilter('eventKey', value)}>
                  <SelectTrigger id="view-data-event-filter" className="w-full">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {filterOptions.eventKeys.map((eventKey) => (
                      <SelectItem key={eventKey} value={eventKey}>
                        {eventKey}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="view-data-team-filter">Team</Label>
                <Input
                  className="h-11"
                  id="view-data-team-filter"
                  inputMode="numeric"
                  placeholder="e.g. 3314"
                  value={filters.teamNumber}
                  onChange={(event) => updateFilter('teamNumber', event.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="view-data-match-filter">Match</Label>
                <Input
                  className="h-11"
                  id="view-data-match-filter"
                  inputMode="numeric"
                  placeholder={dataset === 'match' ? 'e.g. 12' : 'Not available'}
                  value={filters.matchNumber}
                  onChange={(event) => updateFilter('matchNumber', event.target.value.replace(/[^0-9]/g, ''))}
                  disabled={dataset === 'pit'}
                />
              </div>

              <div className="space-y-1 xl:col-span-2">
                <Label htmlFor="view-data-scout-filter">Scout</Label>
                <Input
                  className="h-11"
                  id="view-data-scout-filter"
                  placeholder="Scout name"
                  value={filters.scoutName}
                  onChange={(event) => updateFilter('scoutName', event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {visibleEntries.length} of {filteredEntries.length} filtered entries
              </span>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="px-6 py-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        ) : filteredEntries.length === 0 ? (
          <Card>
            <CardContent className="px-6 py-6 text-sm text-muted-foreground">
              No entries match the selected filters.
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="hidden lg:block text-sm text-muted-foreground">
              Click any row to view full details.
            </p>

            <div className="hidden lg:block overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  {dataset === 'match' ? (
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Alliance</TableHead>
                      <TableHead>Scout</TableHead>
                      <TableHead>Game Data Fields</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Scout</TableHead>
                      <TableHead>Drivetrain</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Game Data Fields</TableHead>
                      <TableHead>View</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {dataset === 'match'
                    ? (visibleEntries as MatchViewEntry[]).map((entry) => {
                      const gameDataFields = flattenedGameDataById.get(entry.id) || [];

                      return (
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
                          data-state={selectedEntryId === entry.id ? 'selected' : undefined}
                          onClick={() => setSelectedEntryId(entry.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedEntryId(entry.id);
                            }
                          }}
                          tabIndex={0}
                          aria-haspopup="dialog"
                          title="Click to view details"
                        >
                          <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                          <TableCell>{entry.eventKey}</TableCell>
                          <TableCell>{entry.matchNumber}</TableCell>
                          <TableCell>{entry.teamNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.allianceColor}</Badge>
                          </TableCell>
                          <TableCell>{entry.scoutName}</TableCell>
                          <TableCell>{gameDataFields.length}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedEntryId(entry.id);
                              }}
                            >
                              View
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                    : (visibleEntries as PitViewEntry[]).map((entry) => {
                      const gameDataFields = flattenedGameDataById.get(entry.id) || [];

                      return (
                        <TableRow
                          key={entry.id}
                          className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
                          data-state={selectedEntryId === entry.id ? 'selected' : undefined}
                          onClick={() => setSelectedEntryId(entry.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedEntryId(entry.id);
                            }
                          }}
                          tabIndex={0}
                          aria-haspopup="dialog"
                          title="Click to view details"
                        >
                          <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                          <TableCell>{entry.eventKey}</TableCell>
                          <TableCell>{entry.teamNumber}</TableCell>
                          <TableCell>{entry.scoutName}</TableCell>
                          <TableCell>{entry.drivetrain || '—'}</TableCell>
                          <TableCell>{entry.weight ? `${entry.weight} lbs` : '—'}</TableCell>
                          <TableCell>{entry.programmingLanguage || '—'}</TableCell>
                          <TableCell>{gameDataFields.length}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedEntryId(entry.id);
                              }}
                            >
                              View
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 lg:hidden">
              {dataset === 'match'
                ? (visibleEntries as MatchViewEntry[]).map((entry) => {
                  const gameDataFields = flattenedGameDataById.get(entry.id) || [];

                  return (
                    <Card
                      key={entry.id}
                      className="py-4 cursor-pointer gap-2"
                      onClick={() => setSelectedEntryId(entry.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedEntryId(entry.id);
                        }
                      }}
                      tabIndex={0}
                      aria-haspopup="dialog"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">Team {entry.teamNumber} · Match {entry.matchNumber}</CardTitle>
                          <Badge variant="outline">{entry.allianceColor}</Badge>
                        </div>
                        <CardDescription>{formatTimestamp(entry.timestamp)}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <MetadataRow label="Event" value={entry.eventKey} />
                          <MetadataRow label="Game Data Fields" value={String(gameDataFields.length)} />
                        </div>
                        <MetadataRow label="Scout" value={entry.scoutName} />
                        <p className="text-xs text-muted-foreground">Tap to view full details</p>
                      </CardContent>
                    </Card>
                  );
                })
                : (visibleEntries as PitViewEntry[]).map((entry) => {
                  const gameDataFields = flattenedGameDataById.get(entry.id) || [];

                  return (
                    <Card
                      key={entry.id}
                      className="py-4 cursor-pointer gap-2"
                      onClick={() => setSelectedEntryId(entry.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedEntryId(entry.id);
                        }
                      }}
                      tabIndex={0}
                      aria-haspopup="dialog"
                    >
                      <CardHeader>
                        <CardTitle className="text-base">Team {entry.teamNumber}</CardTitle>
                        <CardDescription>{formatTimestamp(entry.timestamp)}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                          <MetadataRow label="Event" value={entry.eventKey} />
                          <MetadataRow label="Game Data Fields" value={String(gameDataFields.length)} />
                        </div>
                        <MetadataRow label="Scout" value={entry.scoutName} />
                        <p className="text-xs text-muted-foreground">Tap to view full details</p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>

            <div ref={loadMoreRef} className="py-2 text-center text-sm text-muted-foreground">
              {hasMore ? 'Loading more entries as you scroll…' : 'All matching entries loaded.'}
            </div>

            <Dialog
              open={Boolean(selectedEntry)}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedEntryId(null);
                  setModalTab('qr');
                }
              }}
            >
              <DialogContent className="max-w-3xl max-h-[85vh] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                {selectedEntry ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>
                        {dataset === 'match'
                          ? `Team ${(selectedEntry as MatchViewEntry).teamNumber} · Match ${(selectedEntry as MatchViewEntry).matchNumber}`
                          : `Team ${(selectedEntry as PitViewEntry).teamNumber}`}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedEntry.eventKey} · {selectedEntry.scoutName} · {formatTimestamp(selectedEntry.timestamp)}
                      </DialogDescription>
                    </DialogHeader>

                    <Tabs value={modalTab} onValueChange={(value) => setModalTab(value as 'qr' | 'data')} className="min-h-0">
                      <TabsList>
                        <TabsTrigger value="qr">QR Transfer</TabsTrigger>
                        <TabsTrigger value="data">{dataset === 'match' ? 'Match Data' : 'Pit Data'}</TabsTrigger>
                      </TabsList>

                      {modalTab === 'qr' && (
                        <div className="min-h-0 overflow-y-auto pr-2">
                          {dataset === 'match' ? (
                            <MatchTransferQrContent entry={selectedEntry as MatchViewEntry} />
                          ) : (
                            <PitTransferQrContent entry={selectedEntry as PitViewEntry} />
                          )}
                        </div>
                      )}

                      {modalTab === 'data' && (
                        <div className="space-y-4 min-h-0 overflow-y-auto pr-2">
                          <div className="space-y-1">
                            <MetadataRow label="Entry ID" value={selectedEntry.id} />
                            {dataset === 'match' ? (
                              <>
                                {(selectedEntry as MatchViewEntry).matchKey && (
                                  <MetadataRow label="Match Key" value={(selectedEntry as MatchViewEntry).matchKey} />
                                )}
                                <MetadataRow label="Alliance" value={(selectedEntry as MatchViewEntry).allianceColor} />
                                {(selectedEntry as MatchViewEntry).comments && (
                                  <MetadataRow label="Comments" value={(selectedEntry as MatchViewEntry).comments || '—'} />
                                )}
                              </>
                            ) : (
                              <>
                                <MetadataRow label="Drivetrain" value={(selectedEntry as PitViewEntry).drivetrain || '—'} />
                                <MetadataRow label="Weight" value={(selectedEntry as PitViewEntry).weight ? `${(selectedEntry as PitViewEntry).weight} lbs` : '—'} />
                                <MetadataRow label="Language" value={(selectedEntry as PitViewEntry).programmingLanguage || '—'} />
                                <MetadataRow label="Photo" value={(selectedEntry as PitViewEntry).robotPhoto ? 'Attached' : 'None'} />
                                {(selectedEntry as PitViewEntry).notes && (
                                  <MetadataRow label="Notes" value={(selectedEntry as PitViewEntry).notes || '—'} />
                                )}
                              </>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-sm font-medium">Game Data</p>
                            {selectedGameDataFields.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No game data fields.</p>
                            ) : (
                              <div className="space-y-1">
                                {selectedGameDataFields.map((field) => (
                                  <MetadataRow key={`${selectedEntry.id}-${field.key}`} label={field.key} value={field.value} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Tabs>
                  </>
                ) : null}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
