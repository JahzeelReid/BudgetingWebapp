import React from "react";
// import Box from "@mui/material/Box";
// import TextField from "@mui/material/TextField";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  CircularProgress,
} from "@mui/material";
import Page4 from "./page-4";

function Page3(props) {
  // Props: user_id, changepage
  // on click we should go to page 4
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);

  function fetchUserData() {
    axios({
      method: "POST",
      url: `/api/dashboard_accounts`,
      data: {
        user_id: props.user_id,
        // access_token: accesstoken,
      },
    })
      .then((response) => {
        setAccounts(response.data.accounts);
        setLoading(false);
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
          // props.changepage(2);
        }
      });
  }

  function onAccountClick(account) {
    console.log("Account clicked:", account);
    props.changeacc(account.id);
    // Sends the id to main page for page 4 to init
    if (account.settings.init) {
      props.changepage(5);
    } else {
      props.changepage(4);
    }
  }

  useEffect(() => {
    fetchUserData();
  }, []);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {accounts.map((account, index) => (
          // const lastFour = account.accountNumber.slice(-4);

          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardActionArea
                onClick={() => onAccountClick && onAccountClick(account)}
                // on click send the account id back to base and change to page 4 is init page 5 if not
              >
                <CardContent>
                  <Typography variant="h6">
                    Account X{account.lastfour}
                  </Typography>
                  <Typography color="text.secondary">
                    Balance: ${account.balance.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" mt={1}>
                    Envelopes:{" "}
                  </Typography>
                  {account.settings.init ? (
                    Object.entries(account.settings.catagory).map(
                      ([title, details], index) => (
                        <Typography key={index}>
                          {title}: ${details.balance.toFixed(2)}
                        </Typography>
                      )
                    )
                  ) : (
                    <p>Please click to initialize</p>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Page3;
