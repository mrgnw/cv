import { formatUrl, formatExperience } from "./utils.js";
import { mergeWithDefaults, getDefaultDefaults } from "./resume.js";
import { renderTemplate } from "./templates.js";

/**
 * Generate template data from resume
 * @param {Object} resume - Resume data (should already be merged with defaults)
 * @param {string} css - CSS content to embed
 * @returns {Object} Data ready for template rendering
 */
export function generateTemplateData(resume, css = "") {
	const labels =
		resume.lang === "es"
			? {
					skills: "Habilidades",
					experience: "Experiencia",
					projects: "Proyectos",
					education: "Educación",
					present: "Presente",
				}
			: {
					skills: "Skills",
					experience: "Experience",
					projects: "Projects",
					education: "Education",
					present: "Present",
				};

	const skills = resume.skills || [];
	const skillsPrimary = skills.slice(0, 2).join(", ");
	const skillsSecondary = skills.length > 2 ? skills.slice(2).join(", ") : "";

	const formattedExperience = formatExperience(resume.experience);

	const validProjects = (resume.projects || [])
		.filter((p) => p !== null && p !== undefined)
		.filter((p) => {
			if (typeof p === "string") return false;
			return p.name || p.url || p.description;
		})
		.map((p) => {
			const url = p.url || "#";
			return {
				name: p.name || "Untitled",
				url,
				description: p.description || "",
				showUrl: url !== "#",
				formattedUrl: url !== "#" ? formatUrl(url) : "",
			};
		});

	return {
		...resume,
		labels,
		skillsPrimary,
		skillsSecondary,
		experience: formattedExperience,
		validProjects,
		css,
	};
}

/**
 * Generate HTML from resume data
 * @param {Object} resume - Resume data
 * @param {string} templateSource - Handlebars template source
 * @param {string} css - CSS content to embed
 * @param {Object} defaults - Default values to merge with resume
 * @returns {string} Generated HTML
 */
export function generateHtml(
	resume,
	templateSource,
	css = "",
	defaults = null,
) {
	// Merge with defaults if not already merged
	if (!defaults) {
		defaults = getDefaultDefaults();
	}
	const mergedResume = mergeWithDefaults(resume, defaults);

	// Generate template data
	const templateData = generateTemplateData(mergedResume, css);

	// Render template
	return renderTemplate(templateSource, templateData);
}
