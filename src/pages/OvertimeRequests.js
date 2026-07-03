import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { API_BASE_URL } from "../config/api";

export default function OvertimeRequests() {
  const client = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("loggedInClient") || "{}");
    } catch (_err) {
      return {};
    }
  }, []);

  const clientId = client?.id;
  const companyCode = String(client?.companyCode || "").trim().toLowerCase();
  const baseOrigin = companyCode ? API_BASE_URL : API_BASE_URL;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [success, setSuccess] = useState(null);

  const withClientId = (url) => {
    if (!clientId) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}clientId=${encodeURIComponent(clientId)}`;
  };

  const fetchRequests = async () => {
    if (!clientId) {
      setRequests([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(withClientId(`${baseOrigin}/api/overtime-requests`));
      if (!response.ok) {
        throw new Error(`Failed to fetch overtime requests (${response.status})`);
      }
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Overtime request fetch error:", err);
      setError("Failed to fetch overtime requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [clientId]);

  const handleDecision = async (requestId, action) => {
    if (!requestId || !action) return;
    setActionId(requestId);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        withClientId(`${baseOrigin}/api/overtime-requests/${encodeURIComponent(requestId)}/${action}`),
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error(`Failed to ${action} overtime request`);
      }
      await fetchRequests();
      setSuccess(
        `Overtime request ${action === "approve" ? "approved" : "rejected"} successfully.`
      );
    } catch (err) {
      console.error("Overtime decision error:", err);
      setError(`Failed to ${action} overtime request.`);
    } finally {
      setActionId(null);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString();
  };

  const formatOvertimeHours = (value) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric) || numeric <= 0) return "0h 0m";
    const totalMinutes = Math.round(numeric * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: "#f8f9ff", minHeight: "100vh" }}>
      <Card elevation={3}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Typography variant="h5" fontWeight="bold" sx={{ color: "#351153" }}>
              Overtime Requests
            </Typography>
            <Button
              variant="outlined"
              onClick={fetchRequests}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Refresh
            </Button>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? <LinearProgress sx={{ mb: 2 }} /> : null}

          {!error && requests.length === 0 ? (
            <Paper elevation={0} sx={{ p: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No overtime requests found.
              </Typography>
            </Paper>
          ) : null}

          {requests.length > 0 ? (
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#351153" }}>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Employee</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Overtime</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Reason</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Requested At</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Status</TableCell>
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.map((request) => {
                    const status = String(request?.status || "PENDING").toUpperCase();
                    const isPending = status === "PENDING";
                    const statusColor =
                      status === "APPROVED" ? "success" : status === "REJECTED" ? "error" : "warning";
                    const rowBusy = actionId === request.id;
                    return (
                      <TableRow key={request.id}>
                        <TableCell>{request.employeeName || `Employee ${request.employeeId || "-"}`}</TableCell>
                        <TableCell>{request.date || "-"}</TableCell>
                        <TableCell>{formatOvertimeHours(request.overtimeHours)}</TableCell>
                        <TableCell>{request.reason || "-"}</TableCell>
                        <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                        <TableCell>
                          <Chip size="small" color={statusColor} label={status} />
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                disabled={rowBusy}
                                onClick={() => handleDecision(request.id, "approve")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                color="error"
                                disabled={rowBusy}
                                onClick={() => handleDecision(request.id, "reject")}
                              >
                                Reject
                              </Button>
                            </Box>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
