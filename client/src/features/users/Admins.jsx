import Users from "./Users.jsx";

// Super Admin screen for managing Admin accounts — reuses the Users table with role=ADMIN.
export default function Admins() {
  return <Users role="ADMIN" title="Admins" description="Admins organize the query library and manage user access." />;
}
