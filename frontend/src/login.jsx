import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Login(props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    axios({
      method: "POST",
      url: `${props.url}/api/login`,
      data: { username, password },
    })
      .then((response) => {
        const { access_token, has_teller_initialized } = response.data;

        // Save to Context (which updates localStorage)
        login(access_token);

        // State-driven redirect logic
        if (has_teller_initialized) {
          navigate("/loading");
        } else {
          navigate("/setup");
        }
      })
      .catch((error) => {
        console.error("Login error", error);
        alert("Invalid username or password");
      });
  };

  return (
    <div className="login-page">
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}
