import React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLTableElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLTableElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLTableElement>) => void;
};

const Table = ({ children, className, style, onClick }: Props) => {
  return (
    <div
      className={`relative overflow-x-auto shadow-md sm:rounded-lg ${className}`}
      style={style}
    >
      <table
        className="w-full text-sm text-left rtl:text-right"
        onClick={(e) => onClick?.(e)}
      >
        {children}
      </table>
    </div>
  );
};

export default Table;
