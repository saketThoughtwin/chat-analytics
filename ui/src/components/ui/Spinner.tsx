import React from "react";
import CircularProgress from "@mui/material/CircularProgress";

interface SpinnerProps {
    size?: number | string;
    className?: string;
    color?: string;
    opacity?: number;
    style?: React.CSSProperties;
}

export default function Spinner({
    size = 28,
    className = "",
    color = "currentColor",
    opacity = 1,
    style,
}: SpinnerProps) {
    return (
        <CircularProgress
            className={className}
            size={size}
            sx={{
                color,
                opacity,
            }}
            style={style}
        />
    );
}
