import {
  MODULE_ICONS,
} from "@/lib/ui/module-icons";

import type {
  ModuleIconName,
} from "@/lib/ui/module-icons";

interface ModuleIconProps {
  name:
    ModuleIconName;

  size?:
    number;

  label?:
    string;

  className?:
    string;
}

export default function ModuleIcon({
  name,

  size = 20,

  label,

  className,
}: ModuleIconProps) {
  const icon =
    MODULE_ICONS[
      name
    ];

  return (
    <span
      className={
        className
      }
      aria-hidden={
        label
          ? undefined
          : true
      }
      aria-label={
        label
      }
      role={
        label
          ? "img"
          : undefined
      }
      style={{
        display:
          "inline-flex",

        alignItems:
          "center",

        justifyContent:
          "center",

        width:
          size,

        minWidth:
          size,

        height:
          size,

        fontSize:
          size,

        lineHeight:
          1,
      }}
    >
      {icon}
    </span>
  );
}