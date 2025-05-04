import React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

const TableBody = (props: Props) => {
  return <tbody className={props.className}>{props.children}</tbody>;
};

export default TableBody;
