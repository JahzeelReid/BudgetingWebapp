import React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useState, useEffect, useRef } from "react";
import { useTellerConnect } from "teller-connect-react";
import axios from "axios";

function Page2(props) {
  // this component follows page the login page
  // if the user has not linked their teller
  // should host teller connect and run open() on start up
  // should send the new access code to the db
  // props.user_id
  const [accesstoken, setAccesstoken] = useState("");
  const app_id = "app_ph83hsn3hg9ukkife2000";

  const { open, ready } = useTellerConnect({
    applicationId: app_id,
    environment: "sandbox",
    onSuccess: (authorization) => {
      // Save your access token here
      console.log("Sandbox Access Token:", authorization.accessToken);
      console.log("username at onSuccess:", username);
      // getclientlist(authorization, usernameRef.current);
      setAccesstoken(authorization.accessToken);

      // send to api
      // token = authorization.accessToken;
      // setToken(authorization.accessToken)
    },
  });

  function updateaccesstoken() {
    axios({
      method: "POST",
      url: `/updateaccess`,
      data: {
        user_id: props.user_id,
        access_token: accesstoken,
      },
    })
      .then((response) => {
        // setResponse(response.data);
        props.changepage(3);
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }

  useEffect(() => {
    open();
    //Runs only on the first render
  }, []);

  useEffect(() => {
    updateaccesstoken();
  }, [accesstoken]);

  return <div>teller connect lol</div>;
}

export default Page2;
