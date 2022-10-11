import React from "react";
import Footer from "./Footer";
import Header from "./Header";

const Layout = ({ children, setConnected }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between dark:bg-dark dark:text-dark-text layout">
      <Header setConnected={setConnected} />
      <div className="flex-1 flex flex-col justify-center items-center">
        {children}
      </div>
      <Footer />
    </div>
  );
};

export default Layout;
