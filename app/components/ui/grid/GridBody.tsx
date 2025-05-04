"use client";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const GridBody = ({ children }: Props) => {
  return (
    <div className="card-body px-4">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
};

export default GridBody;
