"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import GridContainer from "@/app/components/ui/grid/GridContainer";

export default function AddCustomerPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomer({ ...customer, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log(customer);
    router.push("/customers");
  };

  return (
    <GridContainer title="Add New Customer">
      <form
        onSubmit={handleSubmit}
        className="p-4 space-y-4 rounded-lg shadow-md"
      >
        <div className="form-control">
          <label className="label">
            <span className="label-text">Name</span>
          </label>
          <input
            type="text"
            name="name"
            value={customer.name}
            onChange={handleChange}
            required
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            name="email"
            value={customer.email}
            onChange={handleChange}
            required
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Phone</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={customer.phone}
            onChange={handleChange}
            required
            className="input input-bordered"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Address</span>
          </label>
          <input
            type="text"
            name="address"
            value={customer.address}
            onChange={handleChange}
            required
            className="input input-bordered"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full mt-4">
          Add Customer
        </button>
      </form>
    </GridContainer>
  );
}
