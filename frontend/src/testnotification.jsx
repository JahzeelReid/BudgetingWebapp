import axios from "axios";
import { AuthContext } from "./AuthContext";
import React, { useState, useEffect, useContext, use } from "react";

export default function TestNotificationButton({ url }) {
  const { token } = useContext(AuthContext);

  const [status, setStatus] = useState("");

  const triggerTest = async () => {
    setStatus("Sending...");
    try {
      axios({
        method: "POST",
        url: `${url}/api/test-push`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          setStatus(res);
        })
        .catch((err) => {
          console.error("Error triggering test push:", err);
          setStatus(err);
        });
    } catch (err) {
      setStatus("Network error.");
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={triggerTest}
        className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm hover:bg-black"
      >
        Send Test Notification
      </button>
      {status && <p className="text-xs mt-2 text-gray-500">{status}</p>}
    </div>
  );
}
