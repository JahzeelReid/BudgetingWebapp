/* public/sw.js */

// 1. Listen for the 'push' event from your Flask server
self.addEventListener("push", (event) => {
  let data = { title: "Budget Alert", body: "New Transaction!" };

  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body,
    icon: "/icon-192x192.png", // Path to your logo
    badge: "/badge-72x72.png", // Small icon for Android status bar
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/", // Where to go when the user clicks
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 2. Handle when the user clicks the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
