import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function CashbackBanner() {
  return (
    <section className="py-6">
      <Container>
        <Reveal className="zari-frame relative overflow-hidden rounded-card bg-ink px-8 py-12 text-center sm:px-16 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-weave opacity-20" />
          <div className="relative">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-zari/20 text-zari-soft">
              <Wallet size={26} />
            </span>
            <h2 className="mt-6 font-display text-3xl text-ivory sm:text-4xl">
              Earn cashback on every order
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ivory/70">
              Get wallet cashback credited after delivery, then redeem up to 20% of
              your next order value. It&apos;s our thank-you for choosing handloom.
            </p>
            <div className="mt-8">
              <Button variant="gold" size="lg" href="/shop">Start earning</Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
