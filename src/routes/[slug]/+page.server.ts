import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import json5 from 'json5';

export const load = (async ({ params, fetch }) => {
    const { slug } = params;
    const filePath = `/versions/${slug}.json5`;

    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const fileContent = await response.text();
        const data = json5.parse(fileContent);

        return data;
    } catch (err) {
        console.error(`Error loading CV version "${slug}":`, err);
        throw error(404, 'CV version not found');
    }
}) satisfies PageServerLoad;