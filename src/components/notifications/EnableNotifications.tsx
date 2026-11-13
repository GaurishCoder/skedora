"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);

  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

export default function EnableNotifications() {
  const [loading, setLoading] = useState(false);

  async function handleEnableNotifications() {
    try {
      setLoading(true);

      // 1. Check browser support
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error("Push notifications are not supported.");
      }

      // 2. Request permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      // 3. Get active service worker
      const registration = await navigator.serviceWorker.ready;

      // 4. Get existing subscription, if any
      let subscription = await registration.pushManager.getSubscription();

      // 5. Create subscription if one doesn't exist
      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!publicKey) {
          throw new Error("VAPID public key is missing.");
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            publicKey,
          ) as BufferSource,
        });
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save subscription");
      }

      console.log("Push subscription saved successfully!");
      alert("Skedora notifications enabled!");
    } catch (error) {
      console.error("Notification error:", error);

      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleEnableNotifications} disabled={loading}>
      {loading ? "Enabling..." : "Enable Notifications"}
    </button>
  );
}
