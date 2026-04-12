import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Button,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import { AuthContext } from "./AuthContext";

const RM_COLORS = {
  drawer: "#161926",
  textSecondary: "#94A3B8",
  accent: "#00D1FF",
};

export default function UpdateBucketDrawer({
  open,
  onClose,
  buckets,
  url,
  income,
  accountId,
}) {
  const [loading, setLoading] = useState(false);
  const { token } = useContext(AuthContext);

  // Local state to manage editable bucket values
  const [localBuckets, setLocalBuckets] = useState([]);

  // Initialize local state when buckets prop or drawer opens
  useEffect(() => {
    if (buckets) {
      setLocalBuckets(
        buckets.map((b) => ({
          ...b,
          goal_amount: b.goal_amount || 0,
          percentage: b.percentage || 0,
        })),
      );
    }
  }, [buckets, open]);

  // Math Logic: Update Amount based on Percentage
  const handlePercentChange = (id, newPercent) => {
    const val = parseFloat(newPercent) || 0;
    setLocalBuckets((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const newAmount = (val / 100) * income;
          return { ...b, percentage: val, goal_amount: newAmount };
        }
        return b;
      }),
    );
  };

  // Math Logic: Update Percentage based on Amount
  const handleAmountChange = (id, newAmount) => {
    const val = parseFloat(newAmount) || 0;
    setLocalBuckets((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const newPercent = income > 0 ? (val / income) * 100 : 0;
          return { ...b, goal_amount: val, percentage: newPercent };
        }
        return b;
      }),
    );
  };

  const totalAllocated = localBuckets.reduce(
    (sum, b) => sum + b.goal_amount,
    0,
  );
  const totalPercent = localBuckets.reduce((sum, b) => sum + b.percentage, 0);
  const isInvalid = Math.abs(totalAllocated - income) > 0.01; // Allow for tiny floating point rounding

  const handleSave = () => {
    setLoading(true);
    axios({
      method: "POST",
      url: `${url}/api/update_bucket_goals`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: { buckets: localBuckets, account_id: accountId },
    })
      .then(() => {
        setLoading(false);
        // alert("here is my account id", accountId);
        onClose();
      })
      .catch((err) => {
        console.error("Error updating buckets", err);
        // alert("here is my account id", accountId);
        setLoading(false);
      });
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 450 },
          bgcolor: RM_COLORS.drawer,
          color: "white",
          p: 3,
          backgroundImage: "none",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Update Bucket Goals
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: RM_COLORS.accent, fontWeight: 600 }}
          >
            Total Income: ${income?.toLocaleString()}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{ color: "white", bgcolor: "rgba(255,255,255,0.05)" }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 3 }} />

      <List sx={{ mt: 1 }}>
        {localBuckets.map((bucket) => (
          <ListItem
            key={bucket.id}
            disableGutters
            sx={{
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              py: 2,
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <ListItemText
              primary={bucket.name}
              primaryTypographyProps={{ sx: { fontWeight: 600, mb: 1 } }}
            />

            <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
              <TextField
                label="Amount"
                type="number"
                variant="outlined"
                size="small"
                value={bucket.goal_amount.toFixed(2)}
                onChange={(e) => handleAmountChange(bucket.id, e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment
                      position="start"
                      sx={{ "& .MuiTypography-root": { color: "white" } }}
                    >
                      $
                    </InputAdornment>
                  ),
                  sx: { color: "white", bgcolor: "rgba(255,255,255,0.05)" },
                }}
                InputLabelProps={{ sx: { color: RM_COLORS.textSecondary } }}
              />
              <TextField
                label="Percent"
                type="number"
                variant="outlined"
                size="small"
                value={bucket.percentage.toFixed(1)}
                onChange={(e) => handlePercentChange(bucket.id, e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment
                      position="end"
                      sx={{ "& .MuiTypography-root": { color: "white" } }}
                    >
                      %
                    </InputAdornment>
                  ),
                  sx: { color: "white", bgcolor: "rgba(255,255,255,0.05)" },
                }}
                InputLabelProps={{ sx: { color: RM_COLORS.textSecondary } }}
              />
            </Box>
          </ListItem>
        ))}
      </List>

      <Box sx={{ mt: "auto", pt: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography sx={{ color: isInvalid ? "#FF4B4B" : RM_COLORS.accent }}>
            Allocated: ${totalAllocated.toFixed(2)}
          </Typography>
          <Typography sx={{ color: isInvalid ? "#FF4B4B" : RM_COLORS.accent }}>
            {totalPercent.toFixed(1)}%
          </Typography>
        </Box>

        {isInvalid && (
          <Typography
            variant="caption"
            sx={{ color: "#FF4B4B", display: "block", mb: 2 }}
          >
            Total must equal your income (${income})
          </Typography>
        )}

        <Button
          fullWidth
          variant="contained"
          disabled={isInvalid || loading}
          onClick={handleSave}
          sx={{
            bgcolor: RM_COLORS.accent,
            color: RM_COLORS.drawer,
            fontWeight: 700,
            "&:disabled": { bgcolor: "rgba(255,255,255,0.1)" },
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Drawer>
  );
}
