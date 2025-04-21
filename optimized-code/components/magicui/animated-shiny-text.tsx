import { ComponentPropsWithoutRef, CSSProperties, FC } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedShinyTextProps
  extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 150,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-lg text-neutral-800/50 dark:text-neutral-200/70 ",

        // Shine effect
        "animate-shiny-text  duration-[3000] bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_0.5s_cubic-bezier(.6,.6,0,1)_infinite]",

        // Shine gradient
        "bg-gradient-to-r from-transparent via-black/30 via-50% to-transparent  dark:via-white",

        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
