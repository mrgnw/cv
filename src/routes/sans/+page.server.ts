import { error } from '@sveltejs/kit';
import { coalesceVersion } from '$lib/versionReader';

export async function load() {
    const data = coalesceVersion("main");

    if (!data) {
        console.error(`Error loading main CV version`);
        error(404, 'CV version not found');
    }

    return data;
}
