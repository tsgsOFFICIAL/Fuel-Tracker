const version = "1.0.6";
const cacheName = "pwa-sw-cachce-fuel-tracker-v" + version;
const assets = [
	"./",
	"./manifest.json",
	"./assets/img/icon-close-min.png",
	"./assets/img/icon-close.png",
	"./assets/img/logo-min.png",
	"./assets/img/logo.png",
	"./assets/pwa/icons/128x128.png",
	"./assets/pwa/icons/144x144.png",
	"./assets/pwa/icons/152x152.png",
	"./assets/pwa/icons/192x192.png",
	"./assets/pwa/icons/384x384.png",
	"./assets/pwa/icons/512x512.png",
	"./assets/pwa/icons/72x72.png",
	"./assets/pwa/icons/96x96.png",
	"./css/main.css",
	"./js/app.js",
	"./js/pwa.js"
];

// Cache all the files to make a PWA
self.addEventListener("install", (installEvent) => {
	installEvent.waitUntil(
		caches
			.open(cacheName)
			.then((cache) => {
				return Promise.all(
					assets.map(async (url) => {
						try {
							const response = await fetch(url);

							if (!response.ok) {
								throw new Error(`Failed to fetch "${url}", status: ${response.status}`);
							}

							return await cache.put(url, response);
						} catch (error) {
							return console.error(`Failed to cache "${url}": ${error.message}`);
						}
					})
				);
			})
			.catch((error) => console.error("Cache open failed:", error))
	);
});

// Implement network-first strategy
self.addEventListener("fetch", (fetchEvent) => {
	fetchEvent.respondWith(
		fetch(fetchEvent.request)
			.then((networkResponse) => {
				// If we got a response from the network, update the cache
				if (networkResponse && networkResponse.status === 200) {
					const responseClone = networkResponse.clone();

					caches.open(cacheName).then((cache) => {
						try {
							cache.put(fetchEvent.request, responseClone);
						} catch (error) {}
					});
				}

				return networkResponse;
			})
			.catch(async () => {
				const cacheResponse = await caches.match(fetchEvent.request);
				return (
					cacheResponse ||
					new Response("Offline and no cached response available", {
						status: 503,
						statusText: "Service Unavailable"
					})
				);
			})
	);
});
