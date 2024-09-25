import type { PageServerLoad } from './$types';

import { readFile } from 'fs/promises';
import path from 'path';
import { error } from '@sveltejs/kit';
import json5 from 'json5';

export const load = (async ({ params }) => {
    const { slug } = params;
    const versionsDir = path.resolve('src/lib/versions');
    const filePath = path.join(versionsDir, `${slug}.json5`);

    try {
        const fileContent = await readFile(filePath, 'utf-8');
        const data = json5.parse(fileContent);

        return data;
    } catch (err) {
        console.error(`Error loading CV version "${slug}":`, err);
        throw error(404, 'CV version not found');
    }
}) satisfies PageServerLoad;