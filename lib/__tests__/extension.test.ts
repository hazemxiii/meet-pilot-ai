import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchDataFromExtension, EXTENSION_ID, type ExtensionDataPayload } from '../extension';

describe('extension utilities', () => {
  describe('EXTENSION_ID', () => {
    it('should have a valid extension ID', () => {
      expect(EXTENSION_ID).toBeDefined();
      expect(typeof EXTENSION_ID).toBe('string');
      expect(EXTENSION_ID.length).toBeGreaterThan(0);
    });
  });

  describe('fetchDataFromExtension', () => {
    beforeEach(() => {
      // Reset window.chrome before each test
      vi.stubGlobal('window', {});
    });

    it('should reject when chrome runtime is not available', async () => {
      await expect(fetchDataFromExtension()).rejects.toThrow(
        'Extension messaging API is not available'
      );
    });

    it('should reject when chrome runtime exists but sendMessage is not available', async () => {
      vi.stubGlobal('window', {
        chrome: {
          runtime: {}
        }
      });

      await expect(fetchDataFromExtension()).rejects.toThrow(
        'Extension messaging API is not available'
      );
    });

    it('should handle successful response from extension', async () => {
      const mockData: ExtensionDataPayload = {
        meetDB: {
          schemaVersion: 1,
          hostEmail: 'test@example.com',
          sessions: []
        }
      };

      const mockSendMessage = vi.fn((id: string, message: unknown, callback: (response: unknown) => void) => {
        callback({ ok: true, data: mockData });
      });

      vi.stubGlobal('window', {
        chrome: {
          runtime: {
            sendMessage: mockSendMessage,
            lastError: undefined
          }
        }
      });

      const result = await fetchDataFromExtension();
      expect(result).toEqual(mockData);
      expect(mockSendMessage).toHaveBeenCalledWith(
        EXTENSION_ID,
        { type: 'GET_STORAGE_DATA' },
        expect.any(Function)
      );
    });

    it('should handle extension error response', async () => {
      const mockSendMessage = vi.fn((id: string, message: unknown, callback: (response: unknown) => void) => {
        callback({ ok: false, error: 'Extension error' });
      });

      vi.stubGlobal('window', {
        chrome: {
          runtime: {
            sendMessage: mockSendMessage,
            lastError: undefined
          }
        }
      });

      await expect(fetchDataFromExtension()).rejects.toThrow('Extension error');
    });

    it('should handle chrome runtime lastError', async () => {
      const mockSendMessage = vi.fn((id: string, message: unknown, callback: (response: unknown) => void) => {
        callback({});
      });

      vi.stubGlobal('window', {
        chrome: {
          runtime: {
            sendMessage: mockSendMessage,
            lastError: { message: 'Connection failed' }
          }
        }
      });

      await expect(fetchDataFromExtension()).rejects.toThrow('Extension unavailable: Connection failed');
    });

    it('should handle invalid response from extension', async () => {
      const mockSendMessage = vi.fn((id: string, message: unknown, callback: (response: unknown) => void) => {
        callback('invalid response');
      });

      vi.stubGlobal('window', {
        chrome: {
          runtime: {
            sendMessage: mockSendMessage,
            lastError: undefined
          }
        }
      });

      await expect(fetchDataFromExtension()).rejects.toThrow('Invalid response from extension');
    });
  });
});
