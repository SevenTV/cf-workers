const VERSION = await import('../package.json').then((pkg) => pkg.version);

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method !== 'GET' || url.pathname !== '/') {
			return new Response(null, { status: 404 });
		}

		return await checkWebsocketHealth(env.EVENTS_API_URL_V3_WS, env.TIMEOUT)
			.then(() => {
				return new Response(null, { status: 204 });
			})
			.catch((err) => {
				return new Response(err, { status: 500 });
			});
	},
} satisfies ExportedHandler<Env>;

function checkWebsocketHealth(eventsApiUrl: string, timeout: number = 5000): Promise<string | null> {
	// anti-pattern but necessary here
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(`${eventsApiUrl}?app=7tv-monitoring&version=${VERSION}`);

		socket.addEventListener('message', (msg) => {
			const json = JSON.parse(msg.data.toString());

			if (json.op === 1 || json.op === 2) {
				// Healthy
				resolve(null);
			} else {
				// Unhealthy
				reject(`invalid message: ${json}`);
			}
		});

		setTimeout(() => {
			// Unhealthy
			reject('timeout');
		}, timeout);
	});
}
