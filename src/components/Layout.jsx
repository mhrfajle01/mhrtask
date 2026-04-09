import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import Toast from "./Toast";

const Layout = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="d-flex flex-column min-vh-100 overflow-x-hidden">
      <Toast />
      {!isAuthPage && <Navbar />}
      
      <main className={`flex-grow-1 position-relative ${!isAuthPage ? 'pb-5 mb-5' : ''}`}>
        <div key={location.pathname} className="route-transition-wrapper">
          {children}
        </div>
      </main>

      {!isAuthPage && <BottomNav />}
    </div>
  );
};

export default Layout;
