
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title || "Skedora";

  const options = {
    body: data.body || "You have a new notification.",
    icon: "https://png.pngtree.com/recommend-works/png-clipart/20250321/ourmid/pngtree-green-check-mark-icon-png-image_15808519.png",
    badge: "/badge-72.png",
    data: {
      url: data.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.openWindow(url)
  );
});
