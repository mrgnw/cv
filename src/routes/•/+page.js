import { dev } from '$app/environment';

export function load() {
	// Allow access in both dev and production
	// In production, only show the version list
	return {
		dev
	};
}
