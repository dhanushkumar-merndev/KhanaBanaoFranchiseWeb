import { CountUp } from "@/components/landing/count-up";
import { Icon } from "@/components/landing/icons";
import { Reveal } from "@/components/motion/reveal";
import { stats } from "@/lib/site";

export function StatsBar() {
  return (
    <div className="shell relative z-20 -mt-16 md:-mt-24">
      <Reveal>
        <div className="grid grid-cols-2 gap-0 rounded-2xl border border-line/70 bg-surface p-6 shadow-[0_28px_60px_-34px_rgba(110,40,20,0.45)] sm:p-8 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const isEvenColumn = index % 2 === 0;
            const isTopRow = index < 2;

            return (
              <div
                key={stat.label}
                className={[
                  "flex items-center justify-center gap-3 px-3 sm:px-6",
                  // Mobile & Tablet (2x2 grid)
                  isEvenColumn ? "border-r border-line/70" : "",
                  isTopRow ? "border-b border-line/70 pb-6 lg:border-b-0 lg:pb-0" : "pt-6 lg:pt-0",
                  // Desktop (4 columns in a row)
                  index > 0 ? "lg:border-l lg:border-line/70 lg:border-t-0" : "",
                ].join(" ")}
              >
                <div className="grid size-9 shrink-0 place-items-center sm:size-10">
                  <Icon
                    name={stat.icon}
                    className="size-7 text-brand-red sm:size-8"
                    strokeWidth={1.5}
                  />
                </div>
                <div className="w-[110px] shrink-0 sm:w-[130px]">
                  <p className="kpi-number text-xl leading-none text-brand-crimson sm:text-2xl md:text-[1.7rem]">
                    <CountUp value={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1.5 text-[0.78rem] font-medium leading-tight text-ink-soft sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>
    </div>
  );
}
