// Bridge file to export version reader functions for PDF generation
// This allows the PDF script to import from built JS instead of TS

export { getAllVersions, getAllVersionMeta } from './src/lib/versionReader.js';
