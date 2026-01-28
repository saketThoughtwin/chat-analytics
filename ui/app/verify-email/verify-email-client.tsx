"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "../../src/store/authStore";

export default function VerifyEmailClient() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email");
  const name = searchParams.get("name");

  const verifyOTP = useAuthStore((state) => state.verifyOTP);
  const tempSignupData = useAuthStore((state) => state.tempSignupData);

  useEffect(() => {
    if (!tempSignupData) {
      router.push("/signup");
    }
  }, [tempSignupData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await verifyOTP(otp);
      router.push("/chat");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={10} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" align="center" fontWeight="bold" color="primary">
            Verify Email
          </Typography>

          <Typography align="center" sx={{ mt: 1, mb: 3 }}>
            We've sent a code to <strong>{email}</strong>
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              margin="normal"
              inputProps={{
                maxLength: 6,
                style: { textAlign: "center", letterSpacing: "6px", fontSize: 22 },
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, py: 1.4 }}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </form>
        </Paper>
      </Container>

      <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
        <CircularProgress />
      </Backdrop>
    </Box>
  );
}
