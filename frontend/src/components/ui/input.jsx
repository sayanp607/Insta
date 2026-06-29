import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    (<input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-gray-300 bg-[#FAF6F0] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EADCCA] disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      ref={ref}
      {...props} />)
  );
})
Input.displayName = "Input"

export { Input }
