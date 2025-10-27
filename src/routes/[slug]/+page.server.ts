import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import { coalesceVersion } from "$lib/versionReader";

export const load = (async ({ params, url }) => {
    const { slug } = params;
    const data = coalesceVersion(slug);

    if (!data) {
        console.error(`Error loading CV version "${slug}"`);
        error(404, "CV version not found");
    }

    // Extract content optimization parameters from URL search params
    const contentLimits = {
        exp1: url.searchParams.has("limitExp1")
            ? parseInt(url.searchParams.get("limitExp1") || "0")
            : null,
        exp2: url.searchParams.has("limitExp2")
            ? parseInt(url.searchParams.get("limitExp2") || "0")
            : null,
        exp3: url.searchParams.has("limitExp3")
            ? parseInt(url.searchParams.get("limitExp3") || "0")
            : null,
        exp4: url.searchParams.has("limitExp4")
            ? parseInt(url.searchParams.get("limitExp4") || "0")
            : null,
        projects: url.searchParams.has("maxProjects")
            ? parseInt(url.searchParams.get("maxProjects") || "0")
            : null,
        removeProjects: url.searchParams.has("removeProjects")
            ? parseInt(url.searchParams.get("removeProjects") || "0")
            : 0,
        print: url.searchParams.has("print"),
    };

    // Debug logging to verify parameters are being received
    if (url.searchParams.has("print")) {
        console.log(`🔍 PDF generation for ${slug}:`);
        console.log(`  URL: ${url.href}`);
        console.log(`  Search params: ${url.searchParams.toString()}`);
        console.log(`  Content limits:`, contentLimits);
        console.log(`  Experience count: ${data.experience?.length || 0}`);
        console.log(`  Projects count: ${data.resolvedProjects?.length || 0}`);
    }

    return { ...data, slug, contentLimits };
}) satisfies PageServerLoad;
