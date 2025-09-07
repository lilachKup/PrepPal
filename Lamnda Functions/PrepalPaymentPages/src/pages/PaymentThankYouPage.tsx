import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const CAPTURE_URL =
  "https://zukr2k1std.execute-api.us-east-1.amazonaws.com/dev/payment/capture";

type Status = "idle" | "pending" | "success" | "error";

type CaptureResponse = {
  status?: string; // e.g., "COMPLETED"
  [k: string]: unknown;
};

export default function PaymentThankYouPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captureBody, setCaptureBody] = useState<CaptureResponse | null>(null);
  const didRunRef = useRef(false);

  const orderId =
    searchParams.get("order_id") ||
    searchParams.get("token") || // PayPal often returns ?token=<ORDER_ID>
    searchParams.get("orderId") || // graceful alias, just in case
    "";

  // ---- helpers ----
  const logGroup = (title: string, fn: () => void) => {
    // collapsed so the console stays tidy
    console.groupCollapsed(`[PaymentThankYou] ${title}`);
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  };

  const capture = async (signal: AbortSignal) => {
    if (!orderId) {
      logGroup("Missing order_id", () => {
        console.error("No order_id/token in URL search params.");
        console.log("URL:", window.location.href);
      });
      setStatus("error");
      setErrorMsg("Missing order_id in the URL.");
      return;
    }

    setStatus("pending");
    setErrorMsg(null);
    setCaptureBody(null);

    try {
      logGroup("Starting capture request", () => {
        console.log("→ URL:", CAPTURE_URL);
        console.log("→ Body:", { order_id: orderId });
        console.log("→ Headers:", {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Idempotency-Key": orderId,
        });
      });

      const resp = await fetch(CAPTURE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          // Makes server-side capture idempotent per order_id
          //"X-Idempotency-Key": orderId,
        },
        body: JSON.stringify({ order_id: orderId }),
        signal,
        credentials: "omit",
        mode: "cors",
      });

      let body: CaptureResponse | null = null;
      let raw = "";
      const ct = resp.headers.get("content-type") || "";

      if (ct.includes("application/json")) {
        body = (await resp.json()) as CaptureResponse;
      } else {
        raw = await resp.text();
        try {
          body = JSON.parse(raw);
        } catch {
          body = { raw };
        }
      }

      logGroup("Capture response", () => {
        console.log("← HTTP:", resp.status, resp.statusText);
        console.log("← Headers (subset):", {
          "content-type": ct,
          "x-request-id": resp.headers.get("x-request-id"),
        });
        console.log("← Body:", body);
      });

      setCaptureBody(body);

      if (!resp.ok) {
        setStatus("error");
        setErrorMsg(`Capture failed (HTTP ${resp.status}).`);
        return;
      }

      // Your Lambda returns { "status": "COMPLETED" } when OK
      if (body?.status === "COMPLETED") {
        console.info("[PaymentThankYou] ✅ Payment status COMPLETED");
        setStatus("success");
      } else {
        console.warn(
          "[PaymentThankYou] Unexpected status - ask user to pay again:",
          body?.status
        );
        setStatus("error");
        setErrorMsg(
          `Payment not completed (status: ${
            body?.status ?? "UNKNOWN"
          }). Please try to pay again.`
        );
      }
    } catch (err: unknown) {
      console.error("[PaymentThankYou] ❌ Capture error:", err);
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Network error during capture."
      );
    }
  };

  useEffect(() => {
    if (didRunRef.current) return; // ensure one-shot in strict/dev
    didRunRef.current = true;

    const controller = new AbortController();
    capture(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

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
        }}
      >
        <header style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Thank you for your payment 🎉</h1>
          <p style={{ margin: "8px 0 0", color: "#555" }}>
            We’ve received your payment. We’re finalizing your order now.
          </p>
        </header>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "3px solid rgba(0,0,0,0.15)",
              borderTopColor:
                status === "error" ? "transparent" : "rgba(0,0,0,0.6)",
              animation: status === "pending" ? "spin 1s linear infinite" : "",
            }}
          />
          {status === "idle" && <span>Preparing the capture…</span>}
          {status === "pending" && (
            <span>Finalizing payment… this won’t take long.</span>
          )}
          {status === "success" && (
            <span>All set! You can safely close this page.</span>
          )}
          {status === "error" && (
            <span>
              We couldn’t confirm your payment yet.{" "}
              <strong>Please try to pay again.</strong>{" "}
              <small style={{ color: "#888" }}>
                {errorMsg ? `(${errorMsg})` : ""}
              </small>
            </span>
          )}
        </div>

        {status === "error" && (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                const controller = new AbortController();
                capture(controller.signal);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Check again
            </button>

          </div>
        )}
      </section>

      <style>
        {`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}
      </style>
    </main>
  );
}
