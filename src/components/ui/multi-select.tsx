"use client";

import { ChevronDownIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "./checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface MultiSelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Multi-select built from shadcn Popover + Command + Checkbox. Shows the
 * selection as removable chips inside the trigger.
 */
export function MultiSelect<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Any",
  label,
  searchable = false,
  className,
}: {
  options: MultiSelectOption<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  placeholder?: string;
  label: string;
  searchable?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selected = options.filter((o) => value.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "flex min-h-[50px] w-full items-center gap-2 rounded-[14px] border-[1.5px] border-input bg-white py-2 pr-3 pl-3 text-left text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 aria-expanded:border-ring",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selected.length === 0 ? (
              <span className="px-0.5 font-medium text-muted-foreground">{placeholder}</span>
            ) : (
              selected.map((o) => (
                <span key={o.value} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pr-1.5 pl-2.5 text-xs font-bold text-secondary-foreground">
                  {o.label}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${o.label}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(o.value);
                    }}
                    className="rounded-full p-0.5 hover:bg-blush-2"
                  >
                    <XIcon aria-hidden className="size-3" />
                  </span>
                </span>
              ))
            )}
          </span>
          <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-primary" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 rounded-[14px] p-1">
        <Command>
          {searchable && <CommandInput placeholder={`Search ${label.toLowerCase()}`} />}
          <CommandList>
            <CommandEmpty>No options.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const on = value.includes(o.value);
                return (
                  <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)} className="gap-2.5 py-2 text-sm font-semibold">
                    <Checkbox checked={on} tabIndex={-1} aria-hidden className="pointer-events-none" />
                    {o.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-lg border-t border-border px-2 py-2 text-left text-[13px] font-bold text-primary hover:bg-muted"
            >
              Clear selection
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
