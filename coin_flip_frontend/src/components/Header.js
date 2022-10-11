import { useContext } from "react";
import { ThemeContext } from "./../context/themeContext";
import { FaDiscord, FaTwitter, FaMoon, FaSun } from "react-icons/fa";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Header = ({ setConnected }) => {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <div>
      <div className="container">
        <div className="flex justify-between items-center">
          <div className=" py-6 text-xl  grid grid-flow-col justify-start items-center gap-4">
            <FaDiscord />
            <FaTwitter />
            <button
              className=""
              onClick={() =>
                setTheme(() => setTheme(theme === "dark" ? "light" : "dark"))
              }
            >
              {theme === "dark" ? <FaMoon /> : <FaSun />}
            </button>
          </div>
          <div>

            <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
              <WalletMultiButton></WalletMultiButton>
            </div>

            {/* <button
              className="bg-blue-600 py-2 px-5 rounded-lg  text-lg font-medium  text-white"
              onClick={() => setConnected((prev) => !prev)}
            >
              Select Wallet
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
