const VERSION = await import('../package.json').then((pkg) => pkg.version);

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method !== 'GET') {
			return new Response(null, { status: 404 });
		}

		let check;
		if (url.pathname === "/ws") {
			check = checkWebsocketHealth;
		} else if (url.pathname === "/sse") {
			check = checkSseHealth;
		} else {
			return new Response(null, { status: 404 });
		}

		return await check(env)
			.then(() => {
				return new Response(null, { status: 204 });
			})
			.catch((err) => {
				return new Response(err, { status: 500 });
			});
	},
} satisfies ExportedHandler<Env>;

async function checkWebsocketHealth(env: Env) {
	await new Promise<void>((resolve, reject) => {
		const socket = new WebSocket(`${env.EVENTS_API_URL_V3_WS}?app=7tv-monitoring&version=${VERSION}`);

		socket.addEventListener('message', (msg) => {
			const json = JSON.parse(msg.data.toString());

			if (json.op === 1 || json.op === 2) {
				resolve();
			}
		});

		setTimeout(() => {
			reject("timeout");
		}, env.TIMEOUT);
	});
}

async function checkSseHealth(env: Env) {
	await new Promise<void>((resolve, reject) => {
		const eventSource = new EventSource(`${env.EVENTS_API_URL_V3_SSE}?app=7tv-monitoring&version=${VERSION}`);

		eventSource.addEventListener("hello", () => resolve());

		setTimeout(() => {
			reject("timeout");
		}, env.TIMEOUT);
	});
}
