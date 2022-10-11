use anchor_lang::prelude::*;

#[error_code]
pub enum CoinFlipError {
    #[msg("Invalid admin")]
    InvalidAdmin,
}