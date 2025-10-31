/**
 * Format timestamp to YYYY-MM-DD HH:MM:SS format
 * @param {string} isoString - ISO timestamp string
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(isoString) {
	return new Date(isoString).toLocaleString('sv-SE', { 
		year: 'numeric', 
		month: '2-digit', 
		day: '2-digit', 
		hour: '2-digit', 
		minute: '2-digit', 
		second: '2-digit' 
	}).replace('T', ' ');
}

/**
 * Generate enabled model IDs from models array
 * @param {Array<{id: string, name: string, enabled: boolean}>} models
 * @returns {string[]} Array of enabled model IDs
 */
export function getEnabledModelIds(models) {
	return models.filter(m => m.enabled).map(m => m.id);
}
