import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getVersion } from '$lib/versionReader';

export const load = (async ({ params }) => {
    const { slug } = params;
    const data = getVersion(slug);

    if (!data) {
        console.error(`Error loading CV version "${slug}"`);
        throw error(404, 'CV version not found');
    }

    return data;
}) satisfies PageServerLoad;