// import React, { useState, useEffect, useContext, use } from "react";
// import {
//   Box,
//   Typography,
//   Drawer,
//   IconButton,
//   List,
//   ListItem,
//   ListItemText,
//   Divider,
// } from "@mui/material";
// import CloseIcon from "@mui/icons-material/Close";
// import axios from "axios";
// import { AuthContext } from "./AuthContext";

// const RM_COLORS = {
//   drawer: "#161926",
//   textSecondary: "#94A3B8",
//   accent: "#00D1FF",
// };

// export default function TransactionDrawer({ open, onClose, bucket, url }) {
//   const [loading, setLoading] = useState(true);
//   const { token } = useContext(AuthContext);
//   const [transactions, setTransactions] = useState([]);
//   //   alert(
//   //     "TransactionDrawer rendered with bucket: " +
//   //       (bucket ? bucket.name : "null") +
//   //       " and bucket.id: " +
//   //       (bucket ? bucket.id : "null"),
//   //   );

//   const getTransactions = () => {
//     axios({
//       method: "POST",
//       url: `${url}/api/bucket-transactions`,
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       data: {
//         bucket: bucket.id,
//       },
//     })
//       .then((res) => {
//         setTransactions(res.data.transactions || []);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error("Error fetching buckets", err);
//         setLoading(false);
//       });
//   };

//   useEffect(() => {
//     if (bucket && open) {
//       getTransactions();
//     }
//   }, [bucket, open]);
//   if (!bucket) return null;
//   return (
//     <Drawer
//       anchor="right"
//       open={open}
//       onClose={onClose}
//       // "PaperProps" styles the actual sliding surface
//       PaperProps={{
//         sx: {
//           width: { xs: "100%", sm: 450 },
//           bgcolor: RM_COLORS.drawer,
//           color: "white",
//           p: 3,
//           backgroundImage: "none", // Removes MUI default elevation overlay
//         },
//       }}
//     >
//       {/* Header */}
//       <Box
//         sx={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           mb: 3,
//         }}
//       >
//         <Box>
//           <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
//             {bucket.name}
//           </Typography>
//           <Typography
//             variant="body2"
//             sx={{ color: RM_COLORS.accent, fontWeight: 600 }}
//           >
//             ${bucket.current_balance?.toLocaleString()} remaining
//           </Typography>
//         </Box>
//         <IconButton
//           onClick={onClose}
//           sx={{ color: "white", bgcolor: "rgba(255,255,255,0.05)" }}
//         >
//           <CloseIcon />
//         </IconButton>
//       </Box>

//       <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 3 }} />

//       <Typography
//         variant="caption"
//         sx={{
//           color: RM_COLORS.textSecondary,
//           fontWeight: 700,
//           letterSpacing: 1.5,
//           textTransform: "uppercase",
//         }}
//       >
//         Transaction History
//       </Typography>

//       <List sx={{ mt: 1 }}>
//         {transactions && transactions.length > 0 ? (
//           transactions.map((tx) => (
//             <ListItem
//               key={tx.id}
//               disableGutters
//               sx={{
//                 borderBottom: "1px solid rgba(255,255,255,0.05)",
//                 py: 2,
//                 display: "flex",
//                 justifyContent: "space-between",
//               }}
//             >
//               <ListItemText
//                 primary={tx.description || "General Transaction"}
//                 secondary={tx.date}
//                 primaryTypographyProps={{
//                   sx: { fontWeight: 600, fontSize: "0.95rem" },
//                 }}
//                 secondaryTypographyProps={{
//                   sx: { color: RM_COLORS.textSecondary, fontSize: "0.8rem" },
//                 }}
//               />
//               <Typography
//                 sx={{
//                   fontWeight: 700,
//                   color: tx.amount < 0 ? "#FF4B4B" : "inherit",
//                 }}
//               >
//                 {tx.amount < 0 ? "-" : ""}${Math.abs(tx.amount).toFixed(2)}
//               </Typography>
//             </ListItem>
//           ))
//         ) : (
//           <Box sx={{ textAlign: "center", py: 10 }}>
//             <Typography
//               sx={{ color: RM_COLORS.textSecondary, fontStyle: "italic" }}
//             >
//               No transactions linked to this bucket yet.
//             </Typography>
//           </Box>
//         )}
//       </List>
//     </Drawer>
//   );
// }
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
  Menu,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import axios from "axios";
import { AuthContext } from "./AuthContext";

const RM_COLORS = {
  drawer: "#161926",
  textSecondary: "#94A3B8",
  accent: "#00D1FF",
  menuBg: "#1F2436",
};

export default function TransactionDrawer({
  open,
  onClose,
  bucket,
  url,
  allBuckets = [], // E.g., your array of { id: 1, name: "groceries", ... }
}) {
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);

  // State for the Dropdown Menu
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTx, setActiveTx] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const getTransactions = () => {
    axios({
      method: "POST",
      url: `${url}/api/bucket-transactions`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        bucket: bucket.id,
      },
    })
      .then((res) => {
        setTransactions(res.data.transactions || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching transactions", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (bucket && open) {
      getTransactions();
    }
  }, [bucket, open]);

  // Menu Handlers
  const handleOpenMenu = (event, tx) => {
    setAnchorEl(event.currentTarget);
    setActiveTx(tx);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveTx(null);
  };

  const handleMoveTransaction = (newBucketId) => {
    if (!activeTx) return;

    console.log(`Moving tx ${activeTx.id} to bucket ${newBucketId}`);
    // Send bucket id
    // send transaction id
    // send name of new bucker or new bucket id
    // Example Axios skeleton for your backend:
    /*
    axios.post(`${url}/api/move-transaction`, {
      transaction_id: activeTx.id,
      new_bucket_id: newBucketId
    }, { headers: { Authorization: `Bearer ${token}` } })
    .then(() => {
       getTransactions(); // Refresh the list after moving
       handleCloseMenu();
    });
    */
    axios({
      method: "POST",
      url: `${url}/api/move_transactions_bucket`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        current_bucket_id: bucket.id,
        transaction_id: activeTx.id,
        new_bucket_id: newBucketId,
      },
    })
      .then((res) => {
        getTransactions(); // Refresh the list after moving
        handleCloseMenu();
      })
      .catch((err) => {
        console.error("Error fetching transactions", err);
        handleCloseMenu();
      });
  };

  if (!bucket) return null;

  return (
    <Drawer
      anchor="right"
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
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              lineHeight: 1.2,
              textTransform: "capitalize",
            }}
          >
            {bucket.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: RM_COLORS.accent, fontWeight: 600 }}
          >
            ${bucket.current_balance?.toLocaleString()} remaining
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

      <Typography
        variant="caption"
        sx={{
          color: RM_COLORS.textSecondary,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Transaction History
      </Typography>

      <List sx={{ mt: 1 }}>
        {transactions && transactions.length > 0 ? (
          transactions.map((tx) => (
            <ListItem
              key={tx.id}
              disableGutters
              sx={{
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                py: 2,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <ListItemText
                primary={tx.description || "General Transaction"}
                secondary={tx.date}
                primaryTypographyProps={{
                  sx: { fontWeight: 600, fontSize: "0.95rem" },
                }}
                secondaryTypographyProps={{
                  sx: { color: RM_COLORS.textSecondary, fontSize: "0.8rem" },
                }}
              />

              {/* Grouped Amount and Action Button */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: tx.amount < 0 ? "#FF4B4B" : "inherit",
                  }}
                >
                  {tx.amount < 0 ? "-" : ""}${Math.abs(tx.amount).toFixed(2)}
                </Typography>

                <IconButton
                  size="small"
                  onClick={(e) => handleOpenMenu(e, tx)}
                  sx={{
                    color: RM_COLORS.textSecondary,
                    "&:hover": { color: "white" },
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
          ))
        ) : (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography
              sx={{ color: RM_COLORS.textSecondary, fontStyle: "italic" }}
            >
              No transactions linked to this bucket yet.
            </Typography>
          </Box>
        )}
      </List>

      {/* The Dropdown Menu for allBuckets */}
      <Menu
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            bgcolor: RM_COLORS.menuBg,
            color: "white",
            border: "1px solid rgba(255,255,255,0.1)",
            minWidth: 150,
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            color: RM_COLORS.textSecondary,
            display: "block",
          }}
        >
          Move to...
        </Typography>
        {allBuckets
          .filter((b) => b.id !== bucket.id) // Excludes the current active bucket
          .map((b) => (
            <MenuItem
              key={b.id}
              onClick={() => handleMoveTransaction(b.id)}
              sx={{
                fontSize: "0.9rem",
                textTransform: "capitalize", // <-- Forces "groceries" to "Groceries"
                "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
              }}
            >
              {b.name}
            </MenuItem>
          ))}
      </Menu>
    </Drawer>
  );
}
