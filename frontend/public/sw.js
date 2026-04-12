// const CACHE_NAME = "bucket-spend-v1";
// const URLS_TO_CACHE = [
//   "/",
//   "/index.html",
//   "/manifest.json",
//   "/favicon.ico",
//   // Note: if using Vite, your JS is usually /src/main.jsx or similar
// ];

// // --- 1. CACHING LOGIC (from service_worker.js) ---

// self.addEventListener("install", (event) => {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then((cache) => {
//       return cache.addAll(URLS_TO_CACHE);
//     }),
//   );
// });

// self.addEventListener("fetch", (event) => {
//   if (event.request.method !== "GET") return;

//   event.respondWith(
//     fetch(event.request)
//       .then((response) => {
//         const clonedResponse = response.clone();
//         caches.open(CACHE_NAME).then((cache) => {
//           cache.put(event.request, clonedResponse);
//         });
//         return response;
//       })
//       .catch(() => caches.match(event.request)),
//   );
// });

// // --- 2. PUSH NOTIFICATION LOGIC (from sw.js) ---

// self.addEventListener("push", (event) => {
//   let data = { title: "Budget Alert", body: "New Transaction!" };
//   if (event.data) {
//     data = event.data.json();
//   }

//   const options = {
//     body: data.body,
//     icon: "/logo192.png", // Ensure this matches your manifest.json
//     vibrate: [100, 50, 100],
//     data: { url: data.url || "/" },
//   };

//   event.waitUntil(self.registration.showNotification(data.title, options));
// });

// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//   event.waitUntil(clients.openWindow(event.notification.data.url));
// });

const CACHE_NAME = "bucket-spend-v1";
const URLS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/favicon.ico"];

// --- 1. CACHING LOGIC ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, clonedResponse));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

// --- 2. PUSH NOTIFICATION LOGIC ---
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
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png", // The tiny icon in the Android status bar
    vibrate: [200, 100, 200],
    tag: "transaction-update", // COLLAPSES multiple notifications into one
    renotify: true, // Still vibrates even if the tag is the same
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
    actions: [
      // Adds interactive buttons
      { action: "view", title: "View Dashboard" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// --- 3. CLICK HANDLER LOGIC ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close(); // Hide the notification immediately

  // Handle specific button clicks from the "actions" array
  if (event.action === "close") return;

  const targetUrl = new URL(event.notification.data.url, self.location.origin)
    .href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Check if the app is already open in a tab
        for (let client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus(); // Switch to the existing tab instead of opening a new one
          }
        }
        // If the app isn't open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
