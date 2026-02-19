// useNotifications.js
import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export const useNotifications = () => {
  const { token } = useContext(AuthContext);
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  const subscribeUser = async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;

      // 1. Request Permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Permission denied for notifications");
        return;
      }

      // 2. Subscribe to Push Service
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });

      // 3. Send Subscription to Flask
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(subscription),
      });

      console.log("User is subscribed!");
    } catch (error) {
      console.error("Failed to subscribe user:", error);
    }
  };

  return { subscribeUser };
};
