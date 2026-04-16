import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Grid,
  Divider,
  Paper,
  Button,
} from "@mui/material";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import TransactionDrawer from "./TransactionDrawer";
import PushSubscription from "./PushSubscription";
import TestNotificationButton from "./testnotification";
import UpdateBucketDrawer from "./UpdateBucketDrawer";
import EditSquareIcon from "@mui/icons-material/EditSquare";
import RefreshIcon from "@mui/icons-material/Refresh";

const RM_COLORS = {
  bg: "#0F111A",
  card: "#1C1F2E",
  accent: "#00D1FF",
  textSecondary: "#94A3B8",
};

export default function Dashboard2(props) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeBucket, setActiveBucket] = useState(null);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState([]);

  const openBucketDetails = (bucket, account) => {
    setActiveBucket(bucket);
    setActiveAccount([
      account.buckets,
      account.last_paycheck,
      account.teller_account_id,
    ]);
    setIsDrawerOpen(true);
  };
  const openSettingDetails = (account) => {
    setActiveAccount([
      account.buckets,
      account.last_paycheck,
      account.teller_account_id,
    ]);
    setIsSettingOpen(true);
  };
  const refreshBuckets = () => {
    setLoading(true);
    axios({
      method: "POST",
      url: `${props.url}/api/refresh_transactions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: {},
    })
      .then((res) => {
        console.log("Test push sent successfully:", res);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Error triggering test push:", err);
      });
    // axios
    //   .get(`${props.url}/api/buckets`, {
    //     headers: { Authorization: `Bearer ${token}` },
    //   })
    //   .then((res) => {
    //     setAccounts(res.data.accounts || []);
    //     setLoading(false);
    //   })
    //   .catch((err) => {
    //     console.error("Error fetching buckets", err);
    //     setLoading(false);
    //   });
  };

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${props.url}/api/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setAccounts(res.data.accounts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching buckets", err);
        setLoading(false);
      });
  }, [token, props.url]);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "80vh",
          bgcolor: RM_COLORS.bg,
        }}
      >
        <CircularProgress sx={{ color: RM_COLORS.accent, mb: 2 }} />
        <Typography sx={{ color: RM_COLORS.textSecondary }}>
          Analyzing your finances...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        pb: 8,
        minHeight: "100vh",
        bgcolor: RM_COLORS.bg,
        color: "white",
      }}
    >
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, mb: 3, letterSpacing: "-0.5px" }}
      >
        Smart Buckets
      </Typography>
      <PushSubscription url={props.url} />
      <TestNotificationButton url={props.url} />

      {accounts.map((acc) => (
        <Paper
          key={acc.id}
          elevation={0}
          sx={{
            mb: 4,
            p: 3,
            borderRadius: 6,
            bgcolor: RM_COLORS.card,
            color: "white",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Institution Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {acc.institution}
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: RM_COLORS.textSecondary }}
              >
                ****{acc.last_four}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: RM_COLORS.textSecondary, fontWeight: 600 }}
              >
                ${acc.last_paycheck} Received on{" "}
                {new Date(acc.last_paycheck_date).toLocaleDateString()}
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: RM_COLORS.accent }}
              >
                ${acc.balance.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 3 }} />

          {/* Buckets Grid */}
          <Grid container spacing={3}>
            {acc.buckets.map((bucket) => {
              const progress = bucket.goal_amount
                ? (bucket.current_balance / bucket.goal_amount) * 100
                : 0;
              const isOver = progress > 100;

              return (
                <Grid item xs={12} key={bucket.id}>
                  {/* CLICKABLE AREA START */}
                  <Box
                    onClick={() => openBucketDetails(bucket, acc)}
                    sx={{
                      cursor: "pointer",
                      "&:hover": { opacity: 0.8 },
                      transition: "opacity 0.2s",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {bucket.id}: {bucket.name}{" "}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${bucket.current_balance.toLocaleString()}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ color: RM_COLORS.textSecondary, ml: 0.5 }}
                        >
                          / ${Number(bucket.goal_amount || 0).toFixed(2)}
                        </Typography>
                      </Typography>
                    </Box>

                    <LinearProgress
                      variant="determinate"
                      value={Math.min(progress, 100)}
                      sx={{
                        height: 12,
                        borderRadius: 6,
                        bgcolor: "rgba(255,255,255,0.1)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 6,
                          backgroundColor: isOver
                            ? "#FF4B4B"
                            : RM_COLORS.accent,
                          backgroundImage: isOver
                            ? "none"
                            : `linear-gradient(90deg, ${RM_COLORS.accent} 0%, #00FFD1 100%)`,
                        },
                      }}
                    />
                  </Box>
                  {/* CLICKABLE AREA END */}
                </Grid>
              );
            })}
            <Button
              size="large"
              onClick={() => openSettingDetails(acc)}
              sx={{ mb: 2 }}
            >
              <EditSquareIcon />
            </Button>
            <Button size="large" onClick={refreshBuckets} sx={{ mb: 2 }}>
              <RefreshIcon />
            </Button>
          </Grid>
        </Paper>
      ))}

      {/* RENDER DRAWER ONCE AT THE BOTTOM */}
      <TransactionDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        bucket={activeBucket}
        url={props.url}
        allBuckets={activeAccount[0]}
      />
      {activeAccount && (
        <UpdateBucketDrawer
          open={isSettingOpen}
          onClose={() => setIsSettingOpen(false)}
          buckets={activeAccount[0]}
          url={props.url}
          income={activeAccount[1]}
          accountId={activeAccount[2]}
        />
      )}
    </Box>
  );
}
