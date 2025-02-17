import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { coalesceVersion } from '$lib/versionReader';

export const load = (async ({ params }) => {
    const { slug } = params;
    const data = coalesceVersion(`es/${slug}`);

    if (!data) {
        console.error(`Error loading Spanish CV version "${slug}"`);
        error(404, 'Spanish CV version not found');
    }

    return { ...data, slug: `es/${slug}` };
}) satisfies PageServerLoad;
