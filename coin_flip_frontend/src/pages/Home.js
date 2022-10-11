import React, { useState } from "react";
import Layout from "../components/Layout";
import Logo from "../assets/images/head.png";
import AfterConnected from "../components/AfterConnected";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";


const Home = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [connected, setConnected] = useState(false);

  return (
    <Layout setConnected={setConnected}>
      <div className="">
        {wallet?.connected ? <AfterConnected /> : <BeforeConnected />}
      </div>
    </Layout>
  );
};

export default Home;

const BeforeConnected = () => {
  return (
    <div className="container">
      <div className="flex justify-center flex-col items-center">
        <h2 className="font-bold uppercase text-2xl md:text-4xl text-center ">
          MOST TRUSTED PLACE TO FLIP
        </h2>
        <img src={Logo} alt="" className="w-48" />
      </div>
    </div>
  );
};
