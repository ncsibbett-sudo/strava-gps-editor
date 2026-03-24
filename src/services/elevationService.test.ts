import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { elevationService } from './elevationService';

describe('ElevationService', () => {
  beforeEach(() => {
    elevationService.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getElevation', () => {
    it('should fetch elevation for a single point', async () => {
      const mockResponse = {
        results: [{ latitude: 40.7128, longitude: -74.006, elevation: 10 }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const elevation = await elevationService.getElevation(40.7128, -74.006);

      expect(elevation).toBe(10);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use cache for repeated requests', async () => {
      const mockResponse = {
        results: [{ latitude: 40.7128, longitude: -74.006, elevation: 10 }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const elevation1 = await elevationService.getElevation(40.7128, -74.006);
      const elevation2 = await elevationService.getElevation(40.7128, -74.006);

      expect(elevation1).toBe(10);
      expect(elevation2).toBe(10);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once due to cache
    });
  });

  describe('getElevations', () => {
    it('should fetch elevations for multiple points', async () => {
      const mockResponse = {
        results: [
          { latitude: 40.0, longitude: -105.0, elevation: 1000 },
          { latitude: 40.001, longitude: -105.001, elevation: 1100 },
          { latitude: 40.002, longitude: -105.002, elevation: 1200 },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const points = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
        { lat: 40.002, lng: -105.002 },
      ];

      const elevations = await elevationService.getElevations(points);

      expect(elevations).toEqual([1000, 1100, 1200]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use cache for already-fetched points', async () => {
      const mockResponse1 = {
        results: [
          { latitude: 40.0, longitude: -105.0, elevation: 1000 },
          { latitude: 40.001, longitude: -105.001, elevation: 1100 },
        ],
      };

      const mockResponse2 = {
        results: [{ latitude: 40.002, longitude: -105.002, elevation: 1200 }],
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      // First batch
      const points1 = [
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
      ];
      await elevationService.getElevations(points1);

      // Second batch with one repeated point
      const points2 = [
        { lat: 40.001, lng: -105.001 }, // Cached
        { lat: 40.002, lng: -105.002 }, // New
      ];
      const elevations = await elevationService.getElevations(points2);

      expect(elevations).toEqual([1100, 1200]);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Second call should only fetch the new point
      const secondCallBody = JSON.parse(
        (global.fetch as any).mock.calls[1][1].body
      );
      expect(secondCallBody.locations).toHaveLength(1);
      expect(secondCallBody.locations[0]).toEqual({
        latitude: 40.002,
        longitude: -105.002,
      });
    });

    it('should handle empty array', async () => {
      const elevations = await elevationService.getElevations([]);
      expect(elevations).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should split large batches into multiple requests', async () => {
      // Create 600 points (should split into 2 requests: 500 + 100)
      const points = Array.from({ length: 600 }, (_, i) => ({
        lat: 40.0 + i * 0.001,
        lng: -105.0 + i * 0.001,
      }));

      const mockResponse1 = {
        results: Array.from({ length: 500 }, (_, i) => ({
          latitude: 40.0 + i * 0.001,
          longitude: -105.0 + i * 0.001,
          elevation: 1000 + i,
        })),
      };

      const mockResponse2 = {
        results: Array.from({ length: 100 }, (_, i) => ({
          latitude: 40.0 + (500 + i) * 0.001,
          longitude: -105.0 + (500 + i) * 0.001,
          elevation: 1500 + i,
        })),
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const elevations = await elevationService.getElevations(points);

      expect(elevations).toHaveLength(600);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Verify first batch
      const firstCallBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(firstCallBody.locations).toHaveLength(500);

      // Verify second batch
      const secondCallBody = JSON.parse((global.fetch as any).mock.calls[1][1].body);
      expect(secondCallBody.locations).toHaveLength(100);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const points = [{ lat: 40.0, lng: -105.0 }];

      await expect(elevationService.getElevations(points)).rejects.toThrow(
        'Open-Elevation API error: 500 Internal Server Error'
      );
    });

    it('should handle timeout', async () => {
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AbortError')), 100)
          )
      );

      const points = [{ lat: 40.0, lng: -105.0 }];

      await expect(elevationService.getElevations(points)).rejects.toThrow();
    }, 35000); // Increase timeout for this test
  });

  describe('cache', () => {
    it('should clear cache', async () => {
      const mockResponse = {
        results: [{ latitude: 40.0, longitude: -105.0, elevation: 1000 }],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await elevationService.getElevation(40.0, -105.0);
      expect(elevationService.getCacheSize()).toBe(1);

      elevationService.clearCache();
      expect(elevationService.getCacheSize()).toBe(0);

      // Should fetch again after cache clear
      await elevationService.getElevation(40.0, -105.0);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should report cache size', async () => {
      const mockResponse = {
        results: [
          { latitude: 40.0, longitude: -105.0, elevation: 1000 },
          { latitude: 40.001, longitude: -105.001, elevation: 1100 },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      expect(elevationService.getCacheSize()).toBe(0);

      await elevationService.getElevations([
        { lat: 40.0, lng: -105.0 },
        { lat: 40.001, lng: -105.001 },
      ]);

      expect(elevationService.getCacheSize()).toBe(2);
    });
  });
});
