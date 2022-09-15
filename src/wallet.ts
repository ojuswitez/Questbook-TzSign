import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';


export const initWallet = async () => {
    const tezos = new TezosToolkit(`${process.env.TEZOS_RPC}`);
    const signer = new InMemorySigner(`${process.env.PRIVATE_KEY}`)
    tezos.setSignerProvider(signer)
    return tezos;
}