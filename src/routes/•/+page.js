import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

export function load() {
	// Only allow access to debug route in development
	if (!dev) {
		error(404, 'Not found');
	}
}
