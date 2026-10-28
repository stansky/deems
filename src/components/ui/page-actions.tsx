import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function PageActions({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("page-actions shadcn-theme", className)} {...props} />;
}
