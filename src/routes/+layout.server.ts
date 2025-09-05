import type { LayoutServerLoad } from './$types';
import { getAllVersions } from '$lib/versionReader';

export const load = (async () => {
	return { versions: Object.values(getAllVersions()) };
}) satisfies LayoutServerLoad;