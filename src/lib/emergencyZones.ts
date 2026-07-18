export const ALERT_ZONE_IDS = ['zone-1b', 'zone-1c', 'zone-1d'];

export function isZoneInAlert(zoneId: string): boolean {
  return ALERT_ZONE_IDS.includes(zoneId);
}

export function getZoneDisplayName(zone: { id: string; name: string }): string {
  if (isZoneInAlert(zone.id)) {
    if (zone.name.startsWith('🚨')) {
      return zone.name;
    }
    return `🚨 ${zone.name}`;
  }
  return zone.name;
}
