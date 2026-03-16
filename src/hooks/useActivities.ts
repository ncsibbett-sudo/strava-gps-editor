import { useActivityStore } from '../stores/activityStore';

/**
 * Custom hook for accessing activity state and actions
 * Provides a cleaner API for components
 */
export function useActivities() {
  return useActivityStore();
}
