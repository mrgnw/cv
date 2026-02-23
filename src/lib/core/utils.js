import { format } from "date-fns";

export function formatDate(dateStr) {
	if (!dateStr) return "";
	try {
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return "";
		return format(date, "MMM yyyy");
	} catch {
		return "";
	}
}

export function formatUrl(url) {
	try {
		return url.replace(/^https?:\/\/(www\.)?/, "");
	} catch {
		return url;
	}
}

export function formatExperience(experience) {
	return (Array.isArray(experience) ? experience : [])
		.filter((job) => job !== null && job !== undefined)
		.map((job) => {
			let formattedDate = "";
			if (job.start) {
				formattedDate = formatDate(job.start);
				if (job.end) {
					formattedDate += ` - ${formatDate(job.end)}`;
				} else {
					formattedDate += " - Present";
				}
			} else if (job.timeframe) {
				formattedDate = job.timeframe;
			}
			return {
				...job,
				achievements: job.achievements || [],
				formattedDate,
			};
		});
}
