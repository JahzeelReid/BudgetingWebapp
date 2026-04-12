import React, { useState } from "react";

const PushSettings = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const subscribeUser = async () => {
    setLoading(true);
    try {
      // 1. Browser Permission Request
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("You denied notification permissions.");
        return;
      }

      // 2. Wait for Service Worker
      const registration = await navigator.serviceWorker.ready;

      // 3. Create Subscription Object
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "YOUR_VAPID_PUBLIC_KEY_HERE",
      });

      // 4. Update Backend
      const response = await fetch("/api/save-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error("Failed to subscribe:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold">Push Notifications</h3>
      <p className="text-sm text-gray-600 mb-4">
        Get alerted when your paycheck hits and buckets reset.
      </p>
      <button
        onClick={subscribeUser}
        disabled={loading || isSubscribed}
        className={`px-4 py-2 rounded ${
          isSubscribed ? "bg-green-500" : "bg-blue-600"
        } text-white font-medium`}
      >
        {loading
          ? "Processing..."
          : isSubscribed
            ? "Alerts Enabled"
            : "Enable Notifications"}
      </button>
    </div>
  );
};

export default PushSettings;
