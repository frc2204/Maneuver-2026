import { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/core/components/ui/dialog';
import { Button } from '@/core/components/ui/button';
import type { PitScoutingEntryBase } from '@/core/types/pit-scouting';
import { buildPitEntryQrPayload } from '@/core/lib/pitEntryTransfer';

const PIT_QR_WARNING_SIZE = 2500;

interface PitTransferQrContentProps {
  entry: PitScoutingEntryBase | null;
}

export function PitTransferQrContent({ entry }: PitTransferQrContentProps) {
  const payload = useMemo(() => {
    if (!entry) return null;
    return buildPitEntryQrPayload(entry);
  }, [entry]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Scan this code to transfer this single pit scouting entry.
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

      <p className="text-xs text-muted-foreground">
        Robot photos are excluded from pit QR payloads to keep scans reliable. Use JSON transfer for images.
      </p>

      {payload && payload.length > PIT_QR_WARNING_SIZE ? (
        <p className="text-sm text-amber-500">
          Large payload ({payload.length} chars). If scan reliability drops, reduce notes/detail fields.
        </p>
      ) : null}
    </div>
  );
}

interface PitTransferQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: PitScoutingEntryBase | null;
}

export function PitTransferQrModal({ open, onOpenChange, entry }: PitTransferQrModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Single Pit Entry Transfer</DialogTitle>
          <DialogDescription>
            Team {entry?.teamNumber ?? '—'} • Event {entry?.eventKey ?? '—'}
          </DialogDescription>
        </DialogHeader>

        <PitTransferQrContent entry={entry} />

        <Button onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
