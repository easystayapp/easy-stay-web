import Header from "../components/Header";

export default function AdminLayout() {
  return (
    <div className={`flex flex-col h-screen w-full bg-gray-100`}>
      <Header to="business" />
    </div>
  );
}
