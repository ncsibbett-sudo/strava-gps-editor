import { GPSPoint } from '../models/GPSPoint';
import { GPSTrack, type TrackMetadata } from '../models/GPSTrack';

const DB_NAME = 'strava-gps-editor';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

interface SerializedPoint {
  lat: number;
  lng: number;
  elevation: number;
  time: string; // ISO 8601
  distance: number;
}

interface SerializedTrack {
  points: SerializedPoint[];
  metadata: {
    name: string;
    type: string;
    startTime: string;
    endTime: string;
  };
}

export interface DraftData {
  activityId: number;
  savedAt: string; // ISO 8601
  originalTrack: SerializedTrack;
  editedTrack: SerializedTrack;
}

// ─── Serialization ────────────────────────────────────────────────────────────

function serializeTrack(track: GPSTrack): SerializedTrack {
  return {
    points: track.points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      elevation: p.elevation,
      time: p.time.toISOString(),
      distance: p.distance,
    })),
    metadata: {
      name: track.metadata.name,
      type: track.metadata.type,
      startTime: track.metadata.startTime.toISOString(),
      endTime: track.metadata.endTime.toISOString(),
    },
  };
}

function deserializeTrack(data: SerializedTrack): GPSTrack {
  const points = data.points.map(
    (p) => new GPSPoint(p.lat, p.lng, p.elevation, new Date(p.time), p.distance)
  );
  const metadata: Partial<TrackMetadata> = {
    name: data.metadata.name,
    type: data.metadata.type,
    startTime: new Date(data.metadata.startTime),
    endTime: new Date(data.metadata.endTime),
  };
  return new GPSTrack(points, metadata);
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'activityId' });
      }
    };

    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save (or overwrite) an in-progress edit draft for the given activity.
 */
export async function saveDraft(
  activityId: number,
  originalTrack: GPSTrack,
  editedTrack: GPSTrack
): Promise<void> {
  const db = await openDB();
  const draft: DraftData = {
    activityId,
    savedAt: new Date().toISOString(),
    originalTrack: serializeTrack(originalTrack),
    editedTrack: serializeTrack(editedTrack),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(draft);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load a saved draft for the given activity, or null if none exists.
 */
export async function loadDraft(
  activityId: number
): Promise<{ originalTrack: GPSTrack; editedTrack: GPSTrack; savedAt: Date } | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(activityId);

    req.onsuccess = () => {
      const data: DraftData | undefined = req.result;
      if (!data) {
        resolve(null);
        return;
      }
      try {
        resolve({
          originalTrack: deserializeTrack(data.originalTrack),
          editedTrack: deserializeTrack(data.editedTrack),
          savedAt: new Date(data.savedAt),
        });
      } catch (err) {
        console.error('Failed to deserialize draft:', err);
        resolve(null);
      }
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete the saved draft for the given activity.
 */
export async function deleteDraft(activityId: number): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(activityId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete all saved drafts (called on logout to clear user data).
 */
export async function deleteAllDrafts(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
