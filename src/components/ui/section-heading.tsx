import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <span className="flex items-center gap-3 eyebrow">
          <span className="h-px w-6 bg-zari/60" aria-hidden />
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl leading-tight text-ink sm:text-4xl md:text-[2.6rem]">
        {title}
      </h2>
      {intro && (
        <p className={cn("max-w-xl text-taupe", align === "center" && "mx-auto")}>
          {intro}
        </p>
      )}
    </Reveal>
  );
}
