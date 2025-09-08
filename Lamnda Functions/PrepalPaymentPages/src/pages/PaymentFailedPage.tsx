import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const SUPPORT_EMAIL = "support@yourdomain.com"; // change to your real address

export default function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);

  // Accept common param names so the same link pattern can be reused
  const orderId =
    searchParams.get("order_id") ||
    searchParams.get("token") ||
    searchParams.get("orderId") ||
    "";

  // Optional failure reason (e.g., provider error)
  const reason = useMemo(() => searchParams.get("reason") ?? "", [searchParams]);

  useEffect(() => {
    document.title = "Payment not completed";
  }, []);

  const handleCopy = async () => {
    try {
      if (!orderId) return;
      await navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No-op: clipboard might be unavailable; UX still fine
    }
  };

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams({
      subject: `Payment issue${orderId ? ` — Order ${orderId}` : ""}`,
      body:
        `Hi,\n\nI couldn't complete my payment.\n` +
        (orderId ? `Order reference: ${orderId}\n` : "") +
        (reason ? `Reason: ${reason}\n` : "") +
        `\nThanks,`,
    }).toString();
    return `mailto:${SUPPORT_EMAIL}?${params}`;
  }, [orderId, reason]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#fafafa",
        color: "#111",
      }}
    >
      <section
        style={{
          width: "min(680px, 92vw)",
          background: "#fff",
          borderRadius: 16,
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
          padding: 24,
          border: "1px solid #eee",
        }}
      >
        <header style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>❌ Payment not completed</h1>
          <p style={{ margin: "8px 0 0", color: "#555" }}>
            We couldn’t confirm your payment. Please{" "}
            <strong>open the email we sent you and try again from the link</strong>.
          </p>
        </header>

        {reason && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              background: "#fff5f5",
              border: "1px solid #ffd6d6",
              borderRadius: 12,
              color: "#a61b1b",
              fontSize: 14,
            }}
          >
            <strong>Details:</strong> {reason}
          </div>
        )}

      </section>
    </main>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  color: "#111",
};
