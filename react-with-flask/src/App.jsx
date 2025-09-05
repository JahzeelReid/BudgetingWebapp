import { useState, useEffect } from "react";
import axios from "axios";

import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
// import SimpleTellerConnect from './Tellerbasic'
// import TellerConnectClass from './Tellercomp'
// import { TellerConnect } from 'teller-connect-react';
import { useTellerConnect } from "teller-connect-react";

function App() {
  const [count, setCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [logged_in, setLoginIn] = useState(false);
  const [token, setToken] = useState();
  const [username, setUsername] = useState("");
  const app_id = "app_ph83hsn3hg9ukkife2000";
  const [response, setResponse] = useState(null);

  const { open, ready } = useTellerConnect({
    applicationId: app_id,
    environment: "sandbox",
    onSuccess: (authorization) => {
      // Save your access token here
      console.log("Sandbox Access Token:", authorization.accessToken);
      getclientlist(authorization);
      pullallusers();
      // send to api
      // token = authorization.accessToken;
      // setToken(authorization.accessToken)
    },
  });

  useEffect(() => {
    pullallusers();
  }, [logged_in]);

  function getclientlist(accesstoken) {
    axios({
      method: "POST",
      url: `/api/newuser`,
      data: {
        auth: accesstoken,
        user: username,
        password: "password",
      },
    })
      .then((response) => {
        setResponse(response.data);
        setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }

  function pullallusers() {
    axios({
      method: "GET",
      url: `/api/getusers`,
    })
      .then((response) => {
        setResponse(response.data);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }
  const toggleState = () => {
    setLoginIn((prev) => !prev);
  };

  return (
    <>
      <div></div>
      <h1>Test values</h1>
      {logged_in ? (
        <div>
          <h1>Here we go again</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>token</th>
              </tr>
            </thead>
            <tbody>
              {response?.users.map((user, index) => (
                <tr key={index}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    x{user.account[0].lastfour}, ${user.account[0].balance}
                    {/* <table>
                      <thead>
                        <tr>
                          <th>digits</th>
                          <th>balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user.account.settings.map((setting, index1) => (
                          <tr key={index1}>
                            <td>{setting.catagory}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <input onChange={(e) => setUsername(e.target.value)} />
          <button onClick={() => open()} disabled={!ready}>
            Connect a bank account
          </button>
          {/* <p>Access values: {token} </p> */}
        </div>
      )}
      <button onClick={toggleState}>Toggle</button>
      <div className="card"></div>
    </>
  );
}

export default App;
