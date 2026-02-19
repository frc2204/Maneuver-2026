import { gzip } from 'pako';
import { fromUint8Array } from 'js-base64';

import type { PitScoutingEntryBase } from '@/core/types/pit-scouting';

const stripPitEntryForQr = (entry: PitScoutingEntryBase): PitScoutingEntryBase => {
  const { robotPhoto: _robotPhoto, ...rest } = entry;
  return rest;
};

export function buildPitEntryQrPayload(entry: PitScoutingEntryBase): string {
  const strippedEntry = stripPitEntryForQr(entry);
  const serializedEntry = JSON.stringify(strippedEntry);
  const compressed = gzip(serializedEntry);

  return JSON.stringify({
    type: 'maneuver-pit-entry',
    version: '1.0-maneuver-core',
    compressed: true,
    encoding: 'gzip+base64',
    strippedFields: ['robotPhoto'],
    generatedAt: Date.now(),
    data: fromUint8Array(compressed),
  });
}
