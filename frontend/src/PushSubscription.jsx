import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import axios from "axios";

// --- HELPER FUNCTION ---
// The browser's Push API requires the VAPID public key to be a specific type of binary array (Uint8Array).
// Your .env file stores it as a Base64 string, so this math converts it.
function urlBase64ToUint8Array(base64String) {
  // 1. Calculate how much padding ('=') is needed to make the string length a multiple of 4
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  // 2. Replace URL-safe characters ('-' and '_') with standard Base64 characters ('+' and '/') and add the padding
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  // 3. Decode the Base64 string into a raw binary string using the browser's built-in atob() function
  const rawData = window.atob(base64);
  // 4. Create a new typed array of 8-bit unsigned integers, matching the length of the raw data
  const outputArray = new Uint8Array(rawData.length);
  // 5. Loop through the raw data and assign the character code of each letter to the corresponding spot in the array
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  // 6. Return the formatted binary array that the PushManager expects
  return outputArray;
}

// --- MAIN COMPONENT ---
const PushSubscription = ({ url }) => {
  // State to track if the user is actively subscribed (changes button UI)
  const [isSubscribed, setIsSubscribed] = useState(false);
  // State to disable the button while the network requests are happening
  const [loading, setLoading] = useState(false);
  // State to display any errors to the user
  const [error, setError] = useState(null);

  const { token } = useContext(AuthContext);

  // The main asynchronous function triggered when the user clicks the button
  const handleSubscribe = async () => {
    // 1. Clear any previous errors and set the loading state to true
    setError(null);
    setLoading(true);

    try {
      // 2. Check if the user's browser even supports Service Workers and Push Notifications
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        // 3. If not supported, throw an error to stop execution
        throw new Error(
          "Push notifications are not supported by this browser.",
        );
      }

      // 4. Ask the user for permission. This triggers the native browser popup ("Allow / Block")
      const permission = await Notification.requestPermission();

      // 5. Check the result of the popup. If they clicked "Block" or dismissed it...
      if (permission !== "granted") {
        // 6. Throw an error so the catch block can handle it
        throw new Error("Permission to send notifications was denied.");
      }

      // 7. Wait for the Service Worker (sw.js) to be fully registered and active
      const registration = await navigator.serviceWorker.ready;

      // 8. Grab your Public Key from Vite's environment variables
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      // 9. Convert that string key into the binary array using our helper function above
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // 10. Ask the browser's PushManager to create a unique subscription for this specific device
      const subscription = await registration.pushManager.subscribe({
        // 11. Security rule: We promise that every push we send will result in a visible notification (no silent tracking)
        userVisibleOnly: true,
        // 12. Hand over our converted public key so the Push Service knows it's us
        applicationServerKey: convertedVapidKey,
      });

      // 13. Send an HTTP POST request to your Flask backend using the Fetch API
      //   const response = await fetch(`${url}/api/save-subscription`, {
      //     // 14. Specify that we are sending data
      //     method: "POST",
      //     // 15. Tell Flask we are sending JSON data
      //     headers: {
      //       "Content-Type": "application/json",
      //       Authorization: `Bearer ${token}`,
      //     },
      //     // 16. Turn the complex subscription object into a plain JSON string
      //     body: JSON.stringify(subscription),
      //   });

      //   // 17. Check if Flask successfully saved it to the database (Status 200-299)
      //   if (!response.ok) {
      //     // 18. If the server threw an error (like a 500), throw a frontend error
      //     throw new Error("Failed to save subscription on the server.");
      //   }
      axios({
        method: "POST",
        url: `${url}/api/save-subscription`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: { sub: JSON.stringify(subscription) },
      })
        .catch((err) => {
          // 20. If anything above failed, catch the error and print it to the developer console
          console.error("Subscription process failed:", err);
          // 21. Set the error state so the user sees a friendly message instead of a broken button
          setError(err.message);
          throw new Error("Failed to save subscription on the server.");
        })
        .finally(() => {
          // 22. Regardless of success or failure, turn off the loading spinner so the button is clickable again
          setLoading(false);
        });

      // 19. If everything succeeded, update the state so the button turns green
      setIsSubscribed(true);
    } catch (err) {
      // 20. If anything above failed, catch the error and print it to the developer console
      console.error("Subscription process failed:", err);
      // 21. Set the error state so the user sees a friendly message instead of a broken button
      setError(err.message);
    } finally {
      // 22. Regardless of success or failure, turn off the loading spinner so the button is clickable again
      setLoading(false);
    }
  };

  // --- COMPONENT UI ---
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm max-w-sm">
      <h3 className="text-lg font-bold text-gray-800 mb-1">Alerts</h3>
      <p className="text-sm text-gray-600 mb-4">
        Get notified when your paycheck hits and buckets reset.
      </p>

      {/* If there is an error, display it in a red text block */}
      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      <button
        onClick={handleSubscribe}
        // Disable the button if it's currently loading OR if they are already subscribed
        disabled={loading || isSubscribed}
        className={`w-full px-4 py-2 rounded-md font-medium text-white transition-colors
          ${
            isSubscribed
              ? "bg-green-500 cursor-default" // Green if success
              : "bg-blue-600 hover:bg-blue-700" // Blue if ready to click
          }
          ${loading ? "opacity-70 cursor-not-allowed" : ""} // Faded if loading
        `}
      >
        {/* Dynamic button text based on current state */}
        {loading
          ? "Connecting..."
          : isSubscribed
            ? "Alerts Enabled ✓"
            : "Enable Notifications"}
      </button>
    </div>
  );
};

export default PushSubscription;
