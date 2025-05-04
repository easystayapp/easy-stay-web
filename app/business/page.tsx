"use client";
import Grid from "../components/ui/grid/Grid";
import GridBody from "../components/ui/grid/GridBody";
import GridContainer from "../components/ui/grid/GridContainer";
import GridHeader from "../components/ui/grid/GridHeader";

export default function DashboardPage() {
  // const handleExport = (type: string) => {
  //   console.log("Exporting data...", type);
  //   // Add your export logic here
  // };

  // const handleAdd = (url: string) => {
  //   console.log("Adding new data...", url);
  //   // Add your add logic here
  // };

  // const handleSearch = (search: string) => {
  //   console.log("Searching data...", search);
  //   // Add your search logic here
  // };

  // const handleFilter = (filter: string[]) => {
  //   console.log("Filtering data...", filter);
  //   // Add your filter logic here
  // };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="stats shadow bg-primary text-primary-content">
          <div className="stat">
            <div className="stat-title text-base font-bold text-primary-content">
              Total customers
            </div>
            <div className="stat-value">1,200</div>
          </div>
        </div>
        <div className="stats shadow bg-primary text-primary-content">
          <div className="stat">
            <div className="stat-title text-base font-bold text-primary-content">
              New leads
            </div>
            <div className="stat-value">230</div>
          </div>
        </div>
        <div className="stats shadow bg-primary text-primary-content">
          <div className="stat">
            <div className="stat-title text-base font-bold text-primary-content">
              Revenue
            </div>
            <div className="stat-value">₹58K</div>
          </div>
        </div>
        <div className="stats shadow bg-primary text-primary-content">
          <div className="stat">
            <div className="stat-title text-base font-bold text-primary-content">
              Revenue
            </div>
            <div className="stat-value">₹58K</div>
          </div>
        </div>
      </div>

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
            <button className="btn btn-primary">Add Customer</button>
            <button className="btn btn-secondary">Export</button>
          </div>
        </GridHeader>
        <GridBody>
          <Grid />
        </GridBody>
      </GridContainer>
    </>
  );
}
