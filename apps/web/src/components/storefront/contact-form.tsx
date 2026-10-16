"use client";
import { useId, useState } from "react";
import { API_URL } from "@/lib/api/client";
export function ContactForm({
  businessId,
  preview = false,
}: {
  businessId: string;
  preview?: boolean;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="store-contact-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (preview || busy) return;
        const form = event.currentTarget;
        const values = new FormData(form);
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const response = await fetch(
            `${API_URL}/businesses/${businessId}/crm/leads`,
            {
              method: "POST",
              credentials: "omit",
              headers: { "Content-Type": "application/json" },
              signal: AbortSignal.timeout(10000),
              body: JSON.stringify({
                name: values.get("name"),
                email: values.get("email"),
                message: values.get("message"),
                website: values.get("website"),
                source: "public-website",
              }),
            },
          );
          if (!response.ok)
            throw new Error(
              response.status === 429
                ? "Too many messages. Please try again later."
                : "Message could not be sent. Please retry.",
            );
          setNotice("Your message was sent to the business.");
          form.reset();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not send message");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={`${id}-name`}>
        Your name
        <input
          id={`${id}-name`}
          name="name"
          required
          maxLength={160}
          autoComplete="name"
          disabled={preview || busy}
        />
      </label>
      <label htmlFor={`${id}-email`}>
        Email address
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          disabled={preview || busy}
        />
      </label>
      <label htmlFor={`${id}-message`}>
        How can we help?
        <textarea
          id={`${id}-message`}
          name="message"
          required
          maxLength={5000}
          rows={5}
          disabled={preview || busy}
        />
      </label>
      <div hidden aria-hidden="true">
        <label>
          Leave this empty
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            maxLength={200}
          />
        </label>
      </div>
      <p className="store-muted">
        Your details are sent to this business to respond to your enquiry. Don’t
        include sensitive information.
      </p>
      <button disabled={preview || busy} type="submit">
        {preview
          ? "Contact form disabled in preview"
          : busy
            ? "Sending…"
            : "Send enquiry"}
      </button>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
