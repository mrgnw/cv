import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getMainVersion } from '$lib/versionReader';

export const load = (async () => {
    const data = getMainVersion();

    if (!data) {
        console.error(`Error loading main CV`);
        throw error(404, 'CV not found');
    }

    return data;
}) satisfies PageServerLoad;