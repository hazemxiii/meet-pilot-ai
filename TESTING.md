# Testing Guide

This project uses Vitest for testing along with React Testing Library for component testing.

## Setup

Testing dependencies have been installed:
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Custom Jest matchers
- `@testing-library/user-event` - User interaction simulation
- `@vitejs/plugin-react` - React plugin for Vite
- `jsdom` - DOM implementation for Node.js

## Test Files

### Library Function Tests
- `lib/__tests__/meetings.test.ts` - Tests for text chunking and meeting processing utilities
- `lib/__tests__/utils.test.ts` - Tests for utility functions (cn class merger)
- `lib/__tests__/extension.test.ts` - Tests for Chrome extension communication

### API Route Tests
- `app/api/meetings/__tests__/route.test.ts` - Tests for meetings API utilities (chunking, sanitization, normalization)
- `app/api/meetings/analyse/[id]/__tests__/utilities.test.ts` - Tests for meeting analysis utilities (JSON parsing, memory context, authorization)

## Running Tests

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI (requires @vitest/ui)
npm run test:ui
```

## Test Structure

Tests are organized by module and use a consistent structure:

```typescript
describe('Module/Feature', () => {
  describe('Specific function/behavior', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

## Writing New Tests

1. Create a `__tests__` directory next to the file you want to test
2. Name the test file: `[filename].test.ts` or `[filename].test.tsx`
3. Import necessary testing utilities
4. Write descriptive test cases using `describe`, `it`, and `expect`

## Notes

- API route tests focus on utility functions rather than full integration tests due to Next.js 16 API route complexity
- Component tests were not included due to Next.js 16 and React 19 compatibility issues with testing libraries
- Tests focus on pure functions and business logic that can be tested in isolation
