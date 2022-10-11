use anchor_lang::prelude::*;



#[account]
#[derive(Default)]
pub struct GlobalState {
    pub admin: Pubkey,
    pub dev_wallet: Pubkey,
    pub dev_fee: u64,
    pub win_percentage: u32,
}


#[account]
#[derive(Default)]
pub struct UserState {
    pub user: Pubkey,
    pub reward_amount: u64,
    pub last_spinresult: bool,
}
