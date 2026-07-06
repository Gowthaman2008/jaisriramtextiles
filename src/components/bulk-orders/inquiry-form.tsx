"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const categories = ["Temple", "Hotel", "Retailer", "Corporate", "Wedding", "Other"];

export function InquiryForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.from("bulk_inquiries").insert({
      name: form.get("name") as string,
      email: form.get("email") as string,
      organisation: form.get("organisation") as string,
      category: form.get("category") as string,
      quantity: form.get("quantity") as string,
      message: form.get("message") as string,
    });

    setStatus(error ? "error" : "done");
  }

  if (status === "done") {
    return (
      <div className="rounded-card border border-dashed border-line bg-cream/60 p-10 text-center">
        <p className="font-display text-xl text-ink">Thank you</p>
        <p className="mt-2 text-sm text-taupe">
          Your enquiry has been received. Our team will get back to you by email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" required />
        <Field label="Email" name="email" type="email" required />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Organisation" name="organisation" />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium text-ink">
            Category
          </label>
          <select
            id="category"
            name="category"
            className="h-11 rounded-pill border border-line bg-ivory px-4 text-sm text-ink outline-none focus-visible:border-zari"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Field label="Approximate quantity" name="quantity" placeholder="e.g. 200 pieces / month" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-ink">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="rounded-2xl border border-line bg-ivory px-4 py-3 text-sm text-ink outline-none focus-visible:border-zari"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-danger">Something went wrong — please try again.</p>
      )}

      <Button type="submit" variant="gold" size="lg" className="w-full sm:w-auto" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-11 rounded-pill border border-line bg-ivory px-4 text-sm text-ink outline-none focus-visible:border-zari"
      />
    </div>
  );
}
