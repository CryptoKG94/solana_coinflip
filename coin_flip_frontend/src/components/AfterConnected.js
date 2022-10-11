import React, { useEffect, useState } from "react";
// import Logo from "../assets/images/logo.png";
import HeadImage from "../assets/images/head.png";
import TailImage from "../assets/images/tail.png";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { coinFlip, initialize, getGlobalData, setGlobalData, getUserPendingRewards, claimRewards, isInitialized } from "../contract/helpers";
import { showToast } from "../contract/utils";
import Modal from "react-modal";

const customStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
  },
};

const AfterConnected = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [currentCoinOption, setCurrentCoinOption] = useState(0);
  const [currentSolOption, setCurrentSolOption] = useState(0);
  const [result, setResult] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [flip, setFlip] = useState(false);
  const [loading, setLoading] = useState(false);
  const coinOptions = ["Heads", "Tails"];
  const solOptions = ["0.05", "0.1", "0.25"];

  const [settingModalIsOpen, setSettingModalIsOpen] = useState(false);
  const [winPercentage, setWinPercentage] = useState(47);
  const [devWallet, setDevWallet] = useState("");
  const [devFee, setDevFee] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingRewards, setPendingRewards] = useState(0);

  const closeModal = async () => {
    setSettingModalIsOpen(false);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
    // subtitle.style.color = "#000000";
  }


  const updateSettingInfo = async () => {
    try {
      let sData = await getGlobalData(wallet, connection);
      if (sData) {
        let dev_win_percentage = sData.winPercentage;
        setWinPercentage(dev_win_percentage);

        let dev_fee = sData.devFee.toNumber();
        setDevFee(dev_fee);

        let dev_wallet = sData.devWallet.toBase58();
        setDevWallet(dev_wallet);

        if (wallet.publicKey.equals(sData.admin)) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      }

      let tmpRewards = await getUserPendingRewards(wallet, connection);
      setPendingRewards(Number(tmpRewards));

    } catch (error) {
      console.log("updateSettingInfo", error);
    }
  }

  useEffect(() => {
    updateSettingInfo();
  }, [wallet.publicKey]);


  const onSettingInfo = async () => {
    await setGlobalData(wallet, connection, devWallet, devFee, winPercentage);
    await updateSettingInfo();
    await closeModal();
  }

  function openSettingModal() {
    setSettingModalIsOpen(true);
  }

  const onClaimRewads = async () => {
    setLoading(true);
    await claimRewards(wallet, connection);
    await updateSettingInfo();
    setLoading(false);
  }

  const initContract = async () => {
    initialize(wallet, connection);
  }

  const flipCoin = async () => {
    if (await isInitialized(wallet, connection) == false) {
      showToast("Not initialized", 2000, 1);
      return;
    }

    // if (showResult) {
    //   setShowResult(false);
    //   setFlip(false);
    //   setLoading(false);
    //   return;
    // }
    setLoading(true);
    if (!wallet || !wallet.publicKey) {
      // showToast("Not Connected");
      setLoading(false);
      return;
    }

    let coinFlipRes = -1;

    try {
      let amount = Number(solOptions[currentSolOption]);
      let res = true;//await payToPlay(wallet, connection, amount);
      if (res == false) {
        // showToast("Paying failed");
      } else {
        coinFlipRes = await coinFlip(wallet, connection, amount);
        if (coinFlipRes == -1) {
          setLoading(false);
          return;
        }

        if (coinFlipRes == 1) { // win
          setResult(coinOptions[currentCoinOption]);
        } else { // loose
          setResult(coinOptions[currentCoinOption == 1 ? 0 : 1]);
        }
        setFlip(true);
      }
    } catch (error) {
      console.log('coin flip error : ', error);
    }

    await updateSettingInfo();

    setTimeout(() => {
      setLoading(false);
      setShowResult(true);
      // setFlip(false);

      if (coinFlipRes == 1) { // win
        onClaimRewads();
      }
    }, 3000);
  };

  return (
    <div>
      <button className={` uppercase rounded-md py-2 px-6 border-[1px] font-bold text-sm md:text-xl shadow-lg bg-yellow-400`}
        onClick={() => initContract()}>Initialize</button>

      {isAdmin && (
        <>
          <button className={` uppercase rounded-md py-2 px-6 border-[1px] font-bold text-sm md:text-xl shadow-lg bg-yellow-400`}
            onClick={() => openSettingModal()}>Settings</button>
        </>
      )}
      <Modal
        isOpen={settingModalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Setting Modal"
      >
        <h2 >Setting Dialog</h2>

        <div className="input-group">
          <label htmlFor="">Winning Percentage</label>
          <input
            onChange={(e) => setWinPercentage(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Amount"
            value={winPercentage}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">Dev Wallet</label>
          <input
            onChange={(e) => setDevWallet(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Address"
            value={devWallet}
          />
        </div>

        <div className="input-group">
          <label htmlFor="">Dev Fee</label>
          <input
            onChange={(e) => setDevFee(e.target.value)}
            name="walletAddress"
            type="text"
            className="custom-input"
            placeholder="Amount"
            value={devFee}
          />
        </div>

        <button className="submit-btn custom-btn" onClick={onSettingInfo}>
          Ok
        </button>
      </Modal>


      <div className="flex justify-center flex-col items-center">
        {/* <img src={Logo} alt="" className={`w-48 ${loading && `coin-image`}`} /> */}
        <div
          className={`coin ${flip ? (result === "Heads" ? "spin-heads" : "spin-tails") : null
            }`}
        >
          <div className="heads">
            <img src={HeadImage} alt="" />
          </div>
          <div className="tails">
            <img src={TailImage} alt="" />
          </div>
        </div>
        <h2 className="font-bold uppercase text-4xl mt-4">
          {showResult ? `Result : ${result}` : "I Like"}
        </h2>
        <div className="grid  grid-flow-col justify-center gap-3 mt-8">
          {coinOptions.map((value, key) => (
            <button
              onClick={() => setCurrentCoinOption(key)}
              key={key}
              className={` uppercase rounded-md py-2 px-6 border-[1px] font-bold text-sm md:text-xl shadow-lg ${currentCoinOption === key ? "bg-yellow-400" : "bg-transparent"
                }`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="grid  grid-flow-col justify-center gap-3 mt-4">
          {solOptions.map((value, key) => (
            <button
              onClick={() => setCurrentSolOption(key)}
              key={key}
              className={` uppercase rounded-md py-2 px-4 border-[1px] font-bold text-sm md:text-xl shadow-lg ${currentSolOption === key ? "bg-yellow-400" : "bg-transparent"
                }`}
            >
              {value}&nbsp;SOL
            </button>
          ))}
        </div>
        <button
          className={` ${loading ? "bg-gray-400 pointer-events-none " : "bg-yellow-400 "
            } px-4 py-2 rounded-md mt-4 font-bold text-sm md:text-xl text-dark`}
          onClick={() => {
            setFlip(false);
            flipCoin();
          }}
        >
          {loading
            ? "Processing..."
            : showResult
              ? "PLAY AGAIN"
              : "DOUBLE OR NOTHING"}
        </button>

        {pendingRewards > 0 && (
          <>
            <button
              className={` ${loading ? "bg-gray-400 pointer-events-none " : "bg-yellow-400 "
                } px-4 py-2 rounded-md mt-4 font-bold text-sm md:text-xl text-dark`}
              onClick={() => {
                onClaimRewads();
              }}
            >
              {"Claim Rewards"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AfterConnected;
