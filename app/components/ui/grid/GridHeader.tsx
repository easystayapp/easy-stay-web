"use client";
import React from "react";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

const GridHeader = ({ children }: Props) => {
  return (
    <>
      <div className="card-header flex items-center justify-between px-4">
        {children}
      </div>
    </>
  );
};

export default GridHeader;
