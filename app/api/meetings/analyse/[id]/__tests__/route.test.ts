import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the Supabase client
vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn((resolve) => resolve({ data: [], error: null })),
        })),
      })),
    }),
  })),
}));

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

// Mock fetch for AI API
global.fetch = vi.fn();

describe('POST /api/meetings/analyse/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: { message: 'Unauthorized' },
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(401);
  });

  it('should return 404 when no chunks found', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn((resolve) => resolve({ data: [], error: null })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(404);
  });

  it('should return 403 when user is not owner of meeting', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn((resolve) => resolve({
            data: [{ user_id: 'other-user', text: 'test' }],
            error: null,
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(403);
  });

  it('should return 500 on database error', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          then: vi.fn((resolve) => resolve({
            data: null,
            error: { code: 'DB_ERROR' },
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(500);
  });

  it('should analyze meeting chunks successfully', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Mock meeting chunks
    const mockFrom = mockClient.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meeting_chunks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [{ user_id: 'user-123', text: 'Test chunk content' }],
                error: null,
              })),
            })),
          })),
        };
      } else if (table === 'memory_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [{ content: 'Previous memory' }],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    // Mock AI API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: '```json{"notes":[{"title":"Note","description":"Desc"}],"tasks":[]}```',
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('notes');
    expect(data).toHaveProperty('tasks');
  });

  it('should handle memory context when available', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meeting_chunks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [{ user_id: 'user-123', text: 'Test chunk' }],
                error: null,
              })),
            })),
          })),
        };
      } else if (table === 'memory_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [
                  { content: 'Memory item 1' },
                  { content: 'Memory item 2' },
                ],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: '```json{"notes":[],"tasks":[]}```',
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(200);
  });

  it('should handle no memory context gracefully', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meeting_chunks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [{ user_id: 'user-123', text: 'Test chunk' }],
                error: null,
              })),
            })),
          })),
        };
      } else if (table === 'memory_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: '```json{"notes":[],"tasks":[]}```',
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(200);
  });

  it('should handle AI API failure gracefully', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meeting_chunks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [{ user_id: 'user-123', text: 'Test chunk' }],
                error: null,
              })),
            })),
          })),
        };
      } else if (table === 'memory_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    (global.fetch as any).mockResolvedValue({
      ok: false,
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    // Should return empty notes and tasks when AI fails
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notes).toEqual([]);
    expect(data.tasks).toEqual([]);
  });

  it('should handle invalid JSON response from AI', async () => {
    const { createClient } = await import('@/utils/supabase/server');
    const mockClient = createClient();
    (mockClient.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const mockFrom = mockClient.from as any;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meeting_chunks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [{ user_id: 'user-123', text: 'Test chunk' }],
                error: null,
              })),
            })),
          })),
        };
      } else if (table === 'memory_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: vi.fn((resolve) => resolve({
                data: [],
                error: null,
              })),
            })),
          })),
        };
      }
      return {};
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: 'invalid json',
      }),
    });

    const request = new NextRequest('http://localhost:3000/api/meetings/analyse/123', {
      method: 'POST',
    });
    const response = await POST(request, { params: Promise.resolve({ id: '123' }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.notes).toEqual([]);
    expect(data.tasks).toEqual([]);
  });
});
