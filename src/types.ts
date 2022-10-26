export interface TransferXTZ {
    type: "transfer",
    contract_id: string,
    amount: number,
    to: string
}


export interface TransferFA1_2 {
    type: "fa_transfer",
    asset_id: string,
    contract_id: string,
    transfer_list: {
        txs: {
            amount: number,
            to: string
        }[]
    }[]
}


export interface TransferFA2 {
    type: "fa2_transfer",
    asset_id: string,
    contract_id: string,
    transfer_list: {
        txs: {
            token_id: number,
            amount: number,
            to: string
        }[]
    }[]
}