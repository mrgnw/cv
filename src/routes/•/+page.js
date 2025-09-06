import { dev } from '$app/environment';

export function load() {
	// Allow access in both dev and production
	// In production, the UI will hide regenerate buttons
	return {
		dev
	};
}
