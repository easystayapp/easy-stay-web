import React from "react";

type Props = {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLTableRowElement>) => void;
};

const TableRow = ({ className, style, children, onClick }: Props) => {
  return (
    <tr className={className} style={style} onClick={(e) => onClick?.(e)}>
      {children}
    </tr>
  );
};

export default TableRow;
