
import { web3 } from '@project-serum/anchor';
import {
    Keypair,
    PublicKey,
    SYSVAR_CLOCK_PUBKEY,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
    TransactionSignature,
    Connection
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as anchor from '@project-serum/anchor';
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
import { WalletContextState } from "@solana/wallet-adapter-react";

import { showToast } from "./utils";
import { toast } from 'react-toastify';

const IDL = require('./coinflip');

const PROGRAM_ID = new PublicKey(
    "5UTM5tuH1a4o4234sP5HKjtzJ5ZoHeBJcBXhpHBmVY24"
);

const PYTH_ACCOUNT = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");

const VAULT_SEED = "VAULT_SEED";
const USER_STATE_SEED = "USER-STATE-SEED";
const GLOBAL_STATE_SEED = "GLOBAL-STATE-SEED";

export const getVaultKey = async () => {
    const [vaultKey] = await PublicKey.findProgramAddress(
        [Buffer.from(VAULT_SEED)],
        PROGRAM_ID
    );
    return vaultKey;
};

export const getUserStateKey = async (userPk) => {
    const [userStateKey] = await PublicKey.findProgramAddress(
        [
            Buffer.from(USER_STATE_SEED),
            userPk.toBuffer(),
        ],
        PROGRAM_ID
    );
    return userStateKey;
};

export const getGlobalStateKey = async (adminPk) => {
    const [pk] = await PublicKey.findProgramAddress(
        [
            Buffer.from(GLOBAL_STATE_SEED),
            adminPk.toBuffer(),
        ],
        PROGRAM_ID
    );
    return pk;
};

export const getProgram = (wallet, connection) => {
    let provider = new anchor.AnchorProvider(
        connection,
        wallet,
        anchor.AnchorProvider.defaultOptions()
    );
    const program = new anchor.Program(IDL, PROGRAM_ID, provider);
    return program;
};

export const isInitialized = async (wallet, connection) => {
    let program = getProgram(wallet, connection);
    let res = await program.account.globalState.all([]);
    if (res.length > 0) {
        return true;
    }

    return false;
}


export const initialize = async (wallet, connection) => {
    if (wallet.publicKey === null) throw new WalletNotConnectedError();

    let program = getProgram(wallet, connection);

    const tx = new Transaction().add(
        await program.methods
            .initialize()
            .accounts({
                admin: wallet.publicKey,
                globalState: await getGlobalStateKey(wallet.publicKey),
            })
            .instruction()
    );

    return await send(connection, wallet, tx);
}

export const getGlobalData = async (wallet, connection) => {
    if (!wallet.publicKey) {
        return null;
    }

    let program = getProgram(wallet, connection);
    try {
        let res = await program.account.globalState.all([]);
        if (res.length == 0) {
            return null;
        }
        return res[0].account;
    } catch (error) {
        console.log('getGlobalData', error);
    }

    return null;
}

export const setGlobalData = async (wallet, connection, devWallet, devFee, winPercentage) => {
    let program = getProgram(wallet, connection);

    await program.methods.setInfo(new PublicKey(devWallet), new anchor.BN(devFee), winPercentage).accounts({
        admin: wallet.publicKey,
        globalState: await getGlobalStateKey(wallet.publicKey),
    }).rpc();

}

export const getUserPendingRewards = async (wallet, connection) => {
    if (!wallet.publicKey) {
        return 0;
    }

    let program = getProgram(wallet, connection);
    try {
        let userStateKey = await getUserStateKey(wallet.publicKey);
        let userData = await program.account.userState.fetch(userStateKey);
        return userData.rewardAmount;
    } catch (error) {
        console.log('getUserData', error);
    }

    return 0;
}

export const coinFlip = async (wallet, connection, amount) => {
    let program = getProgram(wallet, connection);

    let globalData = await getGlobalData(wallet, connection);
    if (!globalData) {
        showToast("Not initialized", 2000, 1);
        return false;
    }

    const vaultKey = await getVaultKey();
    let userStateKey = await getUserStateKey(wallet.publicKey);
    try {
        await program.methods
            .coinflip(new anchor.BN(web3.LAMPORTS_PER_SOL * amount))
            .accounts({
                user: wallet.publicKey,
                pythAccount: PYTH_ACCOUNT,
                globalState: await getGlobalStateKey(globalData.admin),
                vault: vaultKey,
                devAccount: globalData.devWallet,
                userState: userStateKey,
            })
            .rpc();
    } catch (error) {
        console.log('coinFlip', error);
        return -1;
    }

    let userData = await program.account.userState.fetch(userStateKey);

    console.log('vault address : ', vaultKey.toBase58());
    console.log('user data : ', userData);
    console.log('rewards : ', userData.rewardAmount.toString());
    console.log('win percentage : ', globalData.winPercentage);

    // if (userData.lastSpinresult) {
    //     await program.methods.claimReward().accounts({
    //         user: wallet.publicKey,
    //         globalState: await getGlobalStateKey(globalData.admin),
    //         vault: vaultKey,
    //         userState: userStateKey,
    //     }).rpc();
    // }

    return userData.lastSpinresult;
}

export const claimRewards = async (wallet, connection) => {
    let program = getProgram(wallet, connection);

    let globalData = await getGlobalData(wallet, connection);;
    if (!globalData) {
        showToast("Not initialized", 2000, 1);
        return 0;
    }

    const vaultKey = await getVaultKey();
    let userStateKey = await getUserStateKey(wallet.publicKey);
    let userData = await program.account.userState.fetch(userStateKey);

    let rewards = Number(userData.rewardAmount);

    if (rewards > 0) {
        await program.methods.claimReward().accounts({
            user: wallet.publicKey,
            globalState: await getGlobalStateKey(globalData.admin),
            vault: vaultKey,
            userState: userStateKey,
        }).rpc();
    }

    console.log('claimed amount : ', rewards);

    return rewards;
}

async function send(
    connection,
    wallet,
    transaction
) {
    const txHash = await sendTransaction(connection, wallet, transaction);
    if (txHash != null) {
        let confirming_id = showToast("Confirming Transaction ...", -1, 2);
        let res = await connection.confirmTransaction(txHash);
        console.log(txHash);
        toast.dismiss(confirming_id);
        if (res.value.err) showToast("Transaction Failed", 2000, 1);
        else showToast("Transaction Confirmed", 2000);
    } else {
        showToast("Transaction Failed", 2000, 1);
    }
    return txHash;
}


export async function sendTransaction(
    connection,
    wallet,
    transaction
) {
    if (wallet.publicKey === null || wallet.signTransaction === undefined)
        return null;
    try {
        transaction.recentBlockhash = (
            await connection.getLatestBlockhash()
        ).blockhash;
        transaction.feePayer = wallet.publicKey;
        const signedTransaction = await wallet.signTransaction(transaction);
        const rawTransaction = signedTransaction.serialize();

        showToast("Sending Transaction ...", 500);

        const txid = await connection.sendRawTransaction(
            rawTransaction,
            {
                skipPreflight: true,
                preflightCommitment: "processed",
            }
        );
        return txid;
    } catch (e) {
        console.log("tx e = ", e);
        return null;
    }
}
