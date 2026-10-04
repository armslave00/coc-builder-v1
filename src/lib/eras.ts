export function availableInEra(eras: string[] | undefined, eraId: string): boolean {
  return !eras?.length || eras.includes(eraId) || (eraId.startsWith('custom-') && eras.includes('core'));
}
