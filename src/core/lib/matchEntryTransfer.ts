import { gzip } from 'pako';
import { fromUint8Array } from 'js-base64';
import type { ScoutingEntryBase } from '@/core/types/scouting-entry';

/**
 * Build a stable, reusable QR payload for single-match transfer.
 * Payload is compressed to maximize scan reliability.
 */
export function buildMatchEntryQrPayload(
  entry: ScoutingEntryBase<Record<string, unknown>>
): string {
  const serializedEntry = JSON.stringify(entry);
  const compressed = gzip(serializedEntry);

  return JSON.stringify({
    type: 'maneuver-match-entry',
    version: '1.0-maneuver-core',
    compressed: true,
    encoding: 'gzip+base64',
    generatedAt: Date.now(),
    data: fromUint8Array(compressed),
  });
}
