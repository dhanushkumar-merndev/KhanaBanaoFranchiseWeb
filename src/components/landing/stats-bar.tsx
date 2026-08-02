import { CountUp } from "@/components/landing/count-up";
import { Icon } from "@/components/landing/icons";
import { Reveal } from "@/components/motion/reveal";
import { stats } from "@/lib/site";

export function StatsBar() {
  return (
    <div className="shell relative z-20 -mt-16 md:-mt-24">
      <Reveal>
        <div className="grid grid-cols-2 gap-y-8 rounded-2xl border border-line/70 bg-surface px-6 py-8 shadow-[0_28px_60px_-34px_rgba(110,40,20,0.45)] sm:px-8 lg:grid-cols-4 lg:gap-0">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={[
                "flex items-center justify-center gap-3 px-2 text-left",
                index % 2 === 1 ? "border-l border-line/70 lg:border-l" : "",
                index > 0 ? "lg:border-l lg:border-line/70" : "",
              ].join(" ")}
            >
              <Icon
                name={stat.icon}
                className="size-7 shrink-0 text-brand-red sm:size-9"
                strokeWidth={1.5}
              />
              <div>
                <p className="kpi-number text-xl leading-none text-brand-crimson sm:text-2xl md:text-[1.7rem]">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1.5 text-[0.8rem] font-medium text-ink-soft sm:text-sm">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  );
}
