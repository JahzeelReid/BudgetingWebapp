import { useState, useEffect } from 'react'
import axios from "axios";

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// import SimpleTellerConnect from './Tellerbasic'
// import TellerConnectClass from './Tellercomp'
// import { TellerConnect } from 'teller-connect-react';
import { useTellerConnect } from 'teller-connect-react';

function App() {
  const [count, setCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(0);
  const [token, setToken] = useState();
  const app_id = "app_ph83hsn3hg9ukkife2000";
  

  const { open, ready } = useTellerConnect({
    applicationId: app_id,
    environment: "sandbox",
    onSuccess: (authorization) => {
      // Save your access token here
      console.log("Sandbox Access Token:", authorization.accessToken);
      getclientlist(authorization)
      // send to api
      // token = authorization.accessToken;
      // setToken(authorization.accessToken)

    },
  });

  useEffect(() => {
    fetch('/api/time').then(res => res.json()).then(data => {
      setCurrentTime(data.time);
    });
  }, []);

  function getclientlist(accesstoken: any) {
    axios({
      method: "POST",
      url: `/api/user`,
      data: {
        auth: accesstoken,
      },
    })
      .then((response) => {
        setToken(response.data);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }




  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>The current time is {new Date(currentTime * 1000).toLocaleString()}.</p>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
        {/* <SimpleTellerConnect/> */}
        {/* <TellerConnectClass/> */}
        <button onClick={() => open()} disabled={!ready}>
          Connect a bank account
        </button>
        {/* <p>Access values: {token} </p> */}
        

      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
