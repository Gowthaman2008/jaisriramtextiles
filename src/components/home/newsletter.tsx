"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Check, Send } from "lucide-react";

export function Newsletter() {
  const [sent, setSent] = useState(false);
  return (
    <section className="py-20 sm:py-24">
      <Container className="max-w-2xl text-center">
        <Reveal>
          <span className="eyebrow justify-center">Stay in the loop</span>
          <h2 className="mt-4 font-display text-3xl text-ink sm:text-4xl">
            New arrivals, offers &amp; festive drops
          </h2>
          <p className="mx-auto mt-3 max-w-md text-taupe">
            Join our newsletter for early access to collections and members-only offers.
            No spam — only the good stuff.
          </p>

          {sent ? (
            <p className="mt-8 inline-flex items-center gap-2 rounded-pill bg-success/10 px-5 py-3 text-sm font-medium text-success">
              <Check size={16} /> You&apos;re subscribed. Welcome!
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true); // Phase 2: POST to /api/newsletter
              }}
              className="mx-auto mt-8 flex max-w-md items-center gap-2"
            >
              <label htmlFor="news" className="sr-only">Email address</label>
              <input
                id="news"
                type="email"
                required
                placeholder="you@example.com"
                className="h-12 flex-1 rounded-pill border border-line bg-ivory px-5 text-sm outline-none transition focus:border-zari"
              />
              <button
                type="submit"
                className="grid h-12 w-12 place-items-center rounded-full bg-ink text-ivory transition hover:bg-zari-deep"
                aria-label="Subscribe"
              >
                <Send size={17} />
              </button>
            </form>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
