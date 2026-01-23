"use client";

import React, { useState, useEffect, Suspense } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Alert,
    CircularProgress,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "../../src/store/authStore";
import api from "../../src/lib/api";
import { API_ENDPOINTS } from "../../src/lib/apiendpoint";

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        const emailParam = searchParams.get("email");
        const nameParam = searchParams.get("name");
        const tempData = useAuthStore.getState().tempSignupData;

        if (!emailParam || !nameParam) {
            router.push("/signup");
            return;
        }

        setEmail(emailParam);
        setName(nameParam);

        if (tempData && tempData.email === emailParam) {
            setPassword(tempData.password);
        } else {
            // If no password in state (e.g. refresh), redirect to signup
            router.push("/signup");
        }
    }, [searchParams, router]);

    const handleVerify = async () => {
        if (!otp || otp.length !== 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Call register endpoint which now verifies OTP
            await api.post(API_ENDPOINTS.AUTH.SIGNUP, {
                name,
                email,
                password,
                otp,
            });

            // On success, redirect to login
            router.push("/login?verified=true");
        } catch (err: any) {
            console.error("Verification failed", err);
            setError(err.response?.data?.message || "Verification failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setLoading(true);
        setError("");
        try {
            await useAuthStore.getState().sendOTP(name, email);
            alert("OTP resent successfully!");
        } catch (err: any) {
            setError("Failed to resend OTP");
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
                bgcolor: "#f0f2f5",
                p: 2,
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    width: "100%",
                    maxWidth: 400,
                    borderRadius: 4,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                    textAlign: "center",
                }}
            >
                <Typography variant="h5" fontWeight="700" gutterBottom>
                    Verify Your Email
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    We sent a 6-digit code to <strong>{email}</strong>
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                        {error}
                    </Alert>
                )}

                <TextField
                    fullWidth
                    label="Enter OTP"
                    variant="outlined"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    sx={{ mb: 3 }}
                    inputProps={{ style: { textAlign: "center", letterSpacing: "5px", fontSize: "1.2rem" } }}
                />

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleVerify}
                    disabled={loading || otp.length !== 6}
                    sx={{
                        bgcolor: "#6366f1",
                        "&:hover": { bgcolor: "#4f46e5" },
                        mb: 2,
                        height: 48,
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : "Verify & Create Account"}
                </Button>

                <Button
                    variant="text"
                    onClick={handleResend}
                    disabled={loading}
                    sx={{ color: "text.secondary", textTransform: "none" }}
                >
                    Resend Code
                </Button>
            </Paper>
        </Box>
    );
}

export default function VerifyEmail() {
    return (
        <Suspense fallback={
            <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
