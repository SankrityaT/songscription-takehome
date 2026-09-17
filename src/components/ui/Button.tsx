import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "sun";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "btn-fill bg-teal text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_6px_14px_rgba(34,135,123,0.22)] [--fill:rgba(255,255,255,0.16)] hover:shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_8px_18px_rgba(34,135,123,0.3)]",
  secondary:
    "btn-fill bg-card text-ink border border-line-strong shadow-card [--fill:#E6F1EE] hover:border-teal/50 hover:text-teal-deep disabled:hover:border-line-strong disabled:hover:text-ink",
  ghost: "btn-fill bg-transparent text-ink-soft [--fill:rgba(20,19,15,0.06)] hover:text-ink",
  sun: "btn-fill bg-sun text-sun-ink shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_14px_rgba(122,90,0,0.14)] [--fill:#FFD35C]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-10 px-4 text-sm gap-2 rounded-ctl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, iconRight, className = "", children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`press ring-focus inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,box-shadow,color] duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {icon ? <span className="btn-ico -ml-0.5 inline-flex shrink-0">{icon}</span> : null}
      {children}
      {iconRight ? <span className="-mr-0.5 inline-flex shrink-0">{iconRight}</span> : null}
    </button>
  );
});
