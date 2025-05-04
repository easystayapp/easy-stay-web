import React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLTableSectionElement>) => void;
};

const TableHead = ({ className, style, children, onClick }: Props) => {
  return (
    <thead
      className={`text-xs uppercase bg-gray-200 ${className}`}
      style={style}
      onClick={(e) => onClick?.(e)}
    >
      {children}
    </thead>
  );
};

export default TableHead;
