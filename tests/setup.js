// Test setup file for Vitest
import { vi } from 'vitest';

// Mock browser environment
Object.defineProperty(window, 'location', {
  value: {
    search: '',
    pathname: '/'
  },
  writable: true
});

// Mock URLSearchParams for browser environment checks
global.URLSearchParams = URLSearchParams;

// Mock SvelteKit environment
vi.mock('$app/environment', () => ({
  browser: false,
  dev: true,
  building: false,
  version: '1.0.0'
}));

// Mock SvelteKit stores
vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(() => vi.fn())
  },
  navigating: {
    subscribe: vi.fn(() => vi.fn())
  },
  updated: {
    subscribe: vi.fn(() => vi.fn())
  }
}));

// Setup global console to capture test output
global.console = {
  ...console,
  log: vi.fn(console.log),
  warn: vi.fn(console.warn),
  error: vi.fn(console.error)
};
