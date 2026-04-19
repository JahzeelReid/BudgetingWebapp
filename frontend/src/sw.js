import { precacheAndRoute } from "workbox-precaching";

// 1. Workbox handles all caching automatically now.
// No need for manual 'install' or 'fetch' listeners!
precacheAndRoute(self.__WB_MANIFEST);

// --- 2. PUSH NOTIFICATION LOGIC ---
// This forces the waiting service worker to become the active service worker.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      console.log("Service Worker activated and claimed control.");
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Bucket Update", body: "New activity detected." };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    console.error("Push data was not JSON:", e);
  }

  const options = {
    body: data.body,
    // FIX: Ensure these match the icons in your public folder/vite.config
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: "transaction-update",
    renotify: true,
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
    actions: [
      { action: "view", title: "View Dashboard" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// --- 3. CLICK HANDLER LOGIC ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const targetUrl = new URL(event.notification.data.url, self.location.origin)
    .href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
