// import { useNavigate } from "react-router-dom";
// import React, { useState, useEffect, useContext } from "react";
// import {
//   Box,
//   Typography,
//   LinearProgress,
//   Card,
//   CardContent,
//   Grid,
// } from "@mui/material";
// import axios from "axios";
// import { AuthContext } from "./AuthContext";

// export default function Dashboard(props) {
//   const [accounts, setAccounts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const { token } = useContext(AuthContext);

//   useEffect(() => {
//     axios
//       .get(`${props.url}/api/buckets`, {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((res) => {
//         setAccounts(res.accounts);
//         setLoading(false);
//       })
//       .catch((err) => console.error("Error fetching buckets", err));
//   }, [token, props.url]);

//   if (loading)
//     return <Typography sx={{ p: 3 }}>Loading your buckets...</Typography>;

//   return (
//     <Box sx={{ p: 2, pb: 8 }}>
//       {" "}
//       {/* pb: 8 for PWA bottom nav space */}
//       <Typography variant="h4" gutterBottom fontWeight="bold">
//         My Buckets
//       </Typography>
//       {accounts.map((acc) => (
//         <Box key={acc.id} sx={{ mb: 4 }}>
//           <Typography variant="subtitle1" color="text.secondary">
//             {acc.institution} (****{acc.last_four}) — $
//             {acc.balance.toLocaleString()}
//           </Typography>

//           <Grid container spacing={2} sx={{ mt: 1 }}>
//             {acc.buckets.map((bucket) => {
//               // Calculate progress: current_balance / goal
//               const progress = bucket.goal_amount
//                 ? (bucket.current_balance / bucket.goal_amount) * 100
//                 : 0;
//               const isOver = progress > 100;

//               return (
//                 <Grid item xs={12} key={bucket.id}>
//                   <Card variant="outlined">
//                     <CardContent>
//                       <Box
//                         sx={{
//                           display: "flex",
//                           justifyContent: "space-between",
//                           mb: 1,
//                         }}
//                       >
//                         <Typography variant="body1" fontWeight="medium">
//                           {bucket.name}
//                         </Typography>
//                         <Typography
//                           variant="body2"
//                           color={isOver ? "error" : "text.secondary"}
//                         >
//                           ${bucket.current_balance.toFixed(2)} / $
//                           {bucket.goal_amount || "0"}
//                         </Typography>
//                       </Box>

//                       <LinearProgress
//                         variant="determinate"
//                         value={Math.min(progress, 100)}
//                         color={isOver ? "error" : "primary"}
//                         sx={{ height: 10, borderRadius: 5 }}
//                       />
//                     </CardContent>
//                   </Card>
//                 </Grid>
//               );
//             })}
//           </Grid>
//         </Box>
//       ))}
//     </Box>
//   );
// }

import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress, // Added for a better loading look
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import axios from "axios";
import { AuthContext } from "./AuthContext";

export default function Dashboard(props) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    // If no token, don't even try the request
    if (!token) return;

    axios
      .get(`${props.url}/api/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        // FIX: res.data contains the json object { accounts: [...] }
        // We must access .accounts to get the array
        setAccounts(res.data.accounts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching buckets", err);
        setLoading(false); // Stop loading even on error
      });
  }, [token, props.url]);

  // Centered Loading State
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "80vh",
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="text.secondary">
          Fetching your bank data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 8 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        My Buckets
      </Typography>

      {/* Safety check: handles case where accounts might be empty */}
      {accounts.length === 0 && (
        <Typography sx={{ mt: 4 }} color="text.secondary">
          No accounts found. Link a bank to get started.
        </Typography>
      )}

      {accounts.map((acc) => (
        <Box key={acc.id} sx={{ mb: 4 }}>
          <Typography variant="subtitle1" color="text.secondary">
            {acc.institution} (****{acc.last_four}) — $
            {acc.balance.toLocaleString()}
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {acc.buckets.map((bucket) => {
              const progress = bucket.goal_amount
                ? (bucket.current_balance / bucket.goal_amount) * 100
                : 0;
              const isOver = progress > 100;

              return (
                <Grid item xs={12} key={bucket.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="body1" fontWeight="medium">
                          {bucket.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color={isOver ? "error" : "text.secondary"}
                        >
                          ${bucket.current_balance.toFixed(2)} / $
                          {bucket.goal_amount || "0"}
                        </Typography>
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={Math.min(progress, 100)}
                        color={isOver ? "error" : "primary"}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
