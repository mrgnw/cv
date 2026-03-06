import {
	loadResumeFromString,
	mergeWithDefaults,
	getDefaultDefaults,
	renderTemplate,
} from "./core/index.js";
import { generateTemplateData } from "./core/html.js";

export function generatePreview(
	resumeJson,
	templateSource,
	css = "",
	defaults = null,
) {
	try {
		const resume = loadResumeFromString(resumeJson);
		const mergedDefaults = defaults || getDefaultDefaults();
		const mergedResume = mergeWithDefaults(resume, mergedDefaults);
		const templateData = generateTemplateData(mergedResume, css);
		const html = renderTemplate(templateSource, templateData);

		return { html };
	} catch (error) {
		return { error: error.message };
	}
}
