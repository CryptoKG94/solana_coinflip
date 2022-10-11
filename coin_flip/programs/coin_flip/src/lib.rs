use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};
use solana_program::{program::invoke, program::invoke_signed, system_instruction};
use std::mem::size_of;

pub mod account;
pub mod constants;
pub mod errors;

use account::*;
use constants::*;
use errors::*;

declare_id!("5UTM5tuH1a4o4234sP5HKjtzJ5ZoHeBJcBXhpHBmVY24");

#[program]
pub mod coin_flip {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let accts = ctx.accounts;
        accts.global_state.admin = accts.admin.key();
        accts.global_state.dev_wallet = Pubkey::try_from(DEV_WALLET_KEY).unwrap();
        accts.global_state.dev_fee = 3;
        accts.global_state.win_percentage = 47;

        Ok(())
    }

    pub fn set_info(ctx: Context<SetInfo>, dev_wallet: Pubkey, dev_fee: u64, win_percentage: u32) -> Result<()> {
        let accts = ctx.accounts;
        accts.global_state.dev_wallet = dev_wallet;
        accts.global_state.dev_fee = dev_fee;
        accts.global_state.win_percentage = win_percentage;

        Ok(())
    }

    pub fn coinflip(ctx: Context<CoinFlip>, bet_amount: u64) -> Result<()> {
        let accts = ctx.accounts;
        accts.user_state.user = accts.user.key();

        let dev_fee = bet_amount.checked_mul(accts.global_state.dev_fee).unwrap().checked_div(100).unwrap();
        let real_amount = bet_amount - dev_fee;

        // send fee to dev wallet
        invoke(
            &system_instruction::transfer(&accts.user.key(), &accts.devAccount.key(), dev_fee),
            &[
                accts.user.to_account_info().clone(),
                accts.devAccount.clone(),
                accts.system_program.to_account_info().clone(),
            ],
        )?;

        // pay to play
        invoke(
            &system_instruction::transfer(&accts.user.key(), &accts.vault.key(), real_amount),
            &[
                accts.user.to_account_info().clone(),
                accts.vault.clone(),
                accts.system_program.to_account_info().clone(),
            ],
        )?;

        // flip coin
        let pyth_price_info = &accts.pyth_account;
        let pyth_price_data = &pyth_price_info.try_borrow_data()?;
        let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);
        let agg_price = pyth_price.agg.price as u64;

        let ctime = Clock::get().unwrap();
        let c = agg_price + ctime.unix_timestamp as u64;
        let mut r = (c % 100 as u64) as u32;
        if r == 100 {
            r = 99;
        }

        let reward = bet_amount.checked_mul(2).unwrap();
        let percentage = accts.global_state.win_percentage;
        if r <= percentage { // win case
            accts.user_state.reward_amount += reward;
            accts.user_state.last_spinresult = true;
        } else { // lose case
            accts.user_state.last_spinresult = false;
        }

        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {

        let accts = ctx.accounts;
        let amount = accts.user_state.reward_amount;
        accts.user_state.reward_amount = 0;

        if amount > 0 {
            let bump = ctx.bumps.get("vault").unwrap();
            invoke_signed(
                &system_instruction::transfer(&accts.vault.key(), &accts.user.key(), amount),
                &[
                    accts.vault.to_account_info().clone(),
                    accts.user.to_account_info().clone(),
                    accts.system_program.to_account_info().clone(),
                ],
                &[&[VAULT_SEED, &[*bump]]],
            )?;
        }

        Ok(())
    }

    pub fn withdraw_all(ctx: Context<WithdrawAll>, sol_amount: u64) -> Result<()> {
        let accts = ctx.accounts;

        // withdraw sol
        let bump = ctx.bumps.get("vault").unwrap();
        if sol_amount > 0 {
            invoke_signed(
                &system_instruction::transfer(&accts.vault.key(), &accts.admin.key(), sol_amount),
                &[
                    accts.vault.to_account_info().clone(),
                    accts.admin.to_account_info().clone(),
                    accts.system_program.to_account_info().clone(),
                ],
                &[&[VAULT_SEED, &[*bump]]],
            )?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        seeds = [GLOBAL_STATE_SEED.as_bytes(), admin.key().as_ref()],
        bump,
        space = 8 + size_of::<GlobalState>(),
        payer = admin,
    )]
    pub global_state: Account<'info, GlobalState>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetInfo<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED.as_bytes(), admin.key().as_ref()],
        bump,
        has_one = admin,
    )]
    pub global_state: Account<'info, GlobalState>,
}

#[derive(Accounts)]
pub struct CoinFlip<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: We're reading data from this chainlink feed account
    pub pyth_account: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED.as_bytes(), global_state.admin.as_ref()],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump,
    )]
    /// CHECK: this should be checked with vault address
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        address = global_state.dev_wallet
    )]
    /// CHECK: this should be checked with vault address
    pub devAccount: AccountInfo<'info>,

    #[account(
        init_if_needed,
        seeds = [USER_STATE_SEED, user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + size_of::<UserState>()
    )]
    pub user_state: Account<'info, UserState>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED.as_bytes(), global_state.admin.as_ref()],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    /// CHECK: this should be checked with address in global_state
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [USER_STATE_SEED, user.key().as_ref()],
        bump,
        constraint = user_state.user == user.key()
    )]
    pub user_state: Account<'info, UserState>,

    // The Token Program
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawAll<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [GLOBAL_STATE_SEED.as_bytes(), admin.key().as_ref()],
        bump,
        constraint = global_state.admin == admin.key()
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump
    )]
    /// CHECK: this should be checked with address in global_state
    pub vault: AccountInfo<'info>,

    // The Token Program
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
