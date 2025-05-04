"use client";

import GridContainer from "@/app/components/ui/grid/GridContainer";
import GridHeader from "@/app/components/ui/grid/GridHeader";
import GridBody from "@/app/components/ui/grid/GridBody";
import Grid from "@/app/components/ui/grid/Grid";
import Link from "next/link";

export default function CustomersPage() {
  return (
    <GridContainer>
      <GridHeader>
        <div className="card-actions justify-start p-4">
          <label className="input">
            <svg
              className="h-[1em] opacity-50"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <g
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeWidth="2.5"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </g>
            </svg>
            <input type="search" required placeholder="Search" />
          </label>
        </div>
        <div className="card-actions justify-end p-4">
          <Link href={`/customers/add`} className="btn btn-primary">
            Add Customer
          </Link>
          <button className="btn btn-secondary">Export</button>
        </div>
      </GridHeader>
      <GridBody>
        <Grid />
      </GridBody>
    </GridContainer>
  );
}
// This code defines a React component for a customer form page. It uses the `useState` hook to manage the form state and the `useRouter` hook from Next.js for navigation. The form includes fields for name, email, phone, and address, and handles submission by logging the customer data and redirecting to the customers page.
// The form is styled using Tailwind CSS classes for a clean and modern look. The component is exported as the default export of the module.
