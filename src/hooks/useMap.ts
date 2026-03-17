import { useMapStore } from '../stores/mapStore';

/**
 * Custom hook for accessing map state and actions
 */
export function useMap() {
  return useMapStore();
}
