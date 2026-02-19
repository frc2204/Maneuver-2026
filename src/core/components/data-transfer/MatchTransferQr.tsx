import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import type { ScoutingEntryBase } from '@/core/types/scouting-entry';
import { buildMatchEntryQrPayload } from '@/core/lib/matchEntryTransfer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';

const MATCH_QR_WARNING_SIZE = 2500;

type MatchEntry = ScoutingEntryBase<Record<string, unknown>>;

interface MatchTransferQrContentProps {
  entry: MatchEntry | null;
}

export function MatchTransferQrContent({ entry }: MatchTransferQrContentProps) {
  const payload = useMemo(() => {
    if (!entry) return null;
    return buildMatchEntryQrPayload(entry);
  }, [entry]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Scan this code to transfer this single match scouting entry.
      </p>

      <div className="rounded-lg border p-4 bg-muted/20 flex justify-center">
        {payload ? (
          <QRCodeSVG
            value={payload}
            size={280}
            level="M"
            includeMargin
            bgColor="transparent"
            fgColor="currentColor"
            className="text-foreground"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Unable to generate QR payload.</p>
        )}
      </div>

      {payload && payload.length > MATCH_QR_WARNING_SIZE ? (
        <p className="text-sm text-amber-500">
          Large payload ({payload.length} chars). If scan reliability drops, reduce notes/detail fields.
        </p>
      ) : null}
    </div>
  );
}

interface MatchTransferQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: MatchEntry | null;
}

export function MatchTransferQrModal({ open, onOpenChange, entry }: MatchTransferQrModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Single Match Transfer</DialogTitle>
          <DialogDescription>
            Team {entry?.teamNumber ?? '—'} • Match {entry?.matchNumber ?? '—'}
          </DialogDescription>
        </DialogHeader>

        <MatchTransferQrContent entry={entry} />

        <Button onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
