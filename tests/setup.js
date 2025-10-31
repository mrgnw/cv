// Test setup file for Vitest
import { vi } from "vitest";

// Mock browser environment globals
global.window = {
    location: {
        search: "",
        pathname: "/",
    },
};

// Mock URLSearchParams for browser environment checks
global.URLSearchParams = URLSearchParams;

// Mock SvelteKit environment
vi.mock("$app/environment", () => ({
    browser: false,
    dev: true,
    building: false,
    version: "1.0.0",
}));

// Mock SvelteKit stores
vi.mock("$app/stores", () => ({
    page: {
        subscribe: vi.fn(() => vi.fn()),
    },
    navigating: {
        subscribe: vi.fn(() => vi.fn()),
    },
    updated: {
        subscribe: vi.fn(() => vi.fn()),
    },
}));

// Mock SvelteKit load functions
vi.mock("@sveltejs/kit", () => ({
    error: vi.fn((status, message) => {
        const err = new Error(message);
        err.status = status;
        throw err;
    }),
}));

// Setup global console to capture test output
global.console = {
    ...console,
    log: vi.fn(console.log),
    warn: vi.fn(console.warn),
    error: vi.fn(console.error),
};

// Mock DOM APIs that might be used
global.document = {
    createElement: vi.fn(() => ({
        style: {},
        setAttribute: vi.fn(),
        getAttribute: vi.fn(),
    })),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
};

// Mock fetch for any API calls
global.fetch = vi.fn();
