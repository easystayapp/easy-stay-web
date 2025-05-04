"use client";
import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

const GridContainer = ({ children, title }: Props) => {
  return (
    <div className="w-full flex flex-col">
      {title && (
        <div className="p-2 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
      )}
      <div className="w-full">
        <div className="card shadow border border-gray-200 ">{children}</div>
      </div>
    </div>
  );
};

export default GridContainer;
