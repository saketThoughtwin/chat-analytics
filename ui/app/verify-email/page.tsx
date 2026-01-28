import { Suspense } from "react";
import VerifyEmailClient from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: "center", marginTop: 100 }}>Loading...</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
