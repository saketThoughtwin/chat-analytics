import React from 'react';

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
        <svg
            className={className}
            style={{
                width: size,
                height: size,
                color,
                opacity,
                animation: 'spinner-rotate 0.8s linear infinite',
                ...style,
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity={0.25} strokeWidth="4"></circle>
            <path fill="currentColor" fillOpacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            <style>{`
                @keyframes spinner-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </svg>
    );
}
