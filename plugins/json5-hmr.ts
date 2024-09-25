import path from 'path';
import { fileURLToPath } from 'url';

export default function Json5Hmr() {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);

	return {
		name: "json5-hmr",
		enforce: "post",
		handleHotUpdate({ file, server }) {
			const normalizedPath = path.normalize(file);
			const targetPath = path.join(__dirname, '..', 'src', 'lib', 'versions');

			if (normalizedPath.endsWith(".json5") && normalizedPath.startsWith(targetPath)) {
				console.log("Detected change in JSON5 version file. Triggering full reload...");
				server.ws.send({
					type: "full-reload",
					path: "*",
				});
			}
		},
	};
}
