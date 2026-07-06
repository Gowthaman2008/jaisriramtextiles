"use client";

import { Reveal } from "@/components/ui/reveal";
import { Container } from "@/components/ui/container";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Scissors, Truck, ShieldCheck, Wallet } from "lucide-react";

const stats = [
  { value: 25, suffix: "+", label: "Years at the loom" },
  { value: 50000, suffix: "+", label: "Orders delivered" },
  { value: 4.8, suffix: "★", label: "Average rating", float: true },
  { value: 100, suffix: "%", label: "Quality checked" },
];

const pillars = [
  { icon: Scissors, title: "Made in-house", text: "Woven and finished at our own unit in Komarapalayam — no middlemen." },
  { icon: ShieldCheck, title: "Honest quality", text: "Combed cotton and true zari borders, inspected on every metre." },
  { icon: Truck, title: "Fast, tracked delivery", text: "Dispatched across India in 4–7 business days with live tracking." },
  { icon: Wallet, title: "Cashback rewards", text: "Earn wallet cashback on every order, credited after delivery." },
];

export function WhyChooseUs() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="eyebrow flex items-center gap-3">
              <span className="h-px w-6 bg-zari/60" /> Why choose us
            </span>
            <h2 className="mt-4 font-display text-3xl leading-tight text-ink sm:text-4xl">
              A weaver&apos;s standards, a modern experience
            </h2>
            <p className="mt-4 max-w-md text-taupe">
              We&apos;ve manufactured textiles for a generation. Every piece carries the
              care of traditional handloom craft — now delivered to your door.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-2">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-display text-4xl text-zari-deep">
                    {s.float ? "4.8" : <AnimatedCounter value={s.value} suffix={s.suffix} />}
                    {s.float && <span>{s.suffix}</span>}
                  </p>
                  <p className="mt-1 text-sm text-taupe">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((p, i) => (
              <Reveal
                key={p.title}
                delay={i * 0.08}
                className="zari-frame rounded-card bg-cream p-6 transition-shadow duration-300 hover:shadow-soft"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-zari-tint text-zari-deep">
                  <p.icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg text-ink">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-taupe">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
