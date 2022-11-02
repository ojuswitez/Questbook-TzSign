import { hash } from '@stablelib/blake2b';
import { BeaconWallet } from '@taquito/beacon-wallet';
import { DefaultContractType, TezosToolkit } from '@taquito/taquito';
import { b58cdecode, b58cencode, prefix } from '@taquito/utils';
import { TzSignAPI } from './tzSignAPI';


export class TzSign {
    private wallet: TezosToolkit | BeaconWallet;
    private api: TzSignAPI | undefined;
    private contract: DefaultContractType | undefined;
    private latestTxId: string | undefined;

    constructor(wallet: TezosToolkit | BeaconWallet, contract?: any) {
        this.wallet = wallet;
        this.contract = contract;
    }

    private async checkAPI() {
        if (!this.api) {
            this.api = new TzSignAPI();
            await this.api.auth(this.wallet);
        }
    }

    public async createMultiSig(
        owners: string[],
        threshold: string,
        balance: number = 0
    ) {
        const resCode = await this.api!.getContractCode();
        const code = resCode.data;

        if (this.wallet instanceof BeaconWallet) {
            throw new Error("Beacon wallet not supported for origination");
        }

        const origination = await this.wallet.contract.originate({
            code: code,
            storage: {
                counter: 0,
                threshold: Number(threshold),
                keys: owners
            },
            balance: balance.toString(),
        });
        await origination.confirmation();
        this.contract = await origination.contract();
        return this.contract;
    }

    public async isValidSafeAddress(contractAddress: string | undefined = this.contract?.address) {
        const res = await this.api!.getInitStorage(contractAddress!);
        return res.status === 200;
    }

    public async isOwner(address: string, contractAddress: string | undefined = this.contract?.address) {
        const res = await this.api!.getInitStorage(contractAddress!);
        const ownerPublicKeys = res.data.keys;
        const ownerAddresses = ownerPublicKeys.map((pk: string) => {
            if (pk.startsWith("edpk")) {
                const pkBytes = b58cdecode(pk, prefix.edpk);
                return b58cencode(hash(new Uint8Array(pkBytes), 20), prefix.tz1);
            } else if (pk.startsWith("sppk")) {
                const pkBytes = b58cdecode(pk, prefix.sppk);
                return b58cencode(hash(new Uint8Array(pkBytes), 20), prefix.tz2);
            } else {
                throw new Error("Owner public key not supported");
            }
        });
        return ownerAddresses.includes(address);
    }

    public async createXTZTransaction(
        amount: number,
        destination: string,
        contractAddress: string = this.contract?.address!
    ) {
        await this.checkAPI();

        const tx = await this.api!.createOperation({
            type: "transfer",
            contract_id: contractAddress!,
            amount: amount,
            to: destination
        });
        this.latestTxId = tx.operation_id;
        return tx;
    }

    public async createFA1_2Transaction(
        tokenAddress: string,
        txs: {
            to: string,
            amount: number
        }[],
        contractAddress: string = this.contract?.address!
    ) {
        await this.checkAPI();

        const tx = await this.api!.createOperation({
            type: "fa_transfer",
            contract_id: contractAddress,
            asset_id: tokenAddress,
            transfer_list: [{ txs }]
        });
        this.latestTxId = tx.operation_id;
        return tx;
    }

    public async createFA2Transaction(
        tokenAddress: string,
        txs: {
            to: string,
            amount: number,
            token_id: number
        }[],
        contractAddress: string = this.contract?.address!
    ) {
        await this.checkAPI();

        const tx = await this.api!.createOperation({
            type: "fa2_transfer",
            contract_id: contractAddress,
            asset_id: tokenAddress,
            transfer_list: [{ txs }]
        });
        this.latestTxId = tx.operation_id;
        return tx;
    }

    public async getTransactionHashStatus(
        transactionHash: string,
        contractAddress: string | undefined = this.contract?.address
    ) {
        await this.checkAPI();

        const txs = await this.api!.getOperations(contractAddress!);
        return txs.find((tx: any) => tx.operation_id === transactionHash);
    }

    public async signTx(
        type: "approve" | "reject",
        contractAddress: string | undefined = this.contract?.address,
        txId: string = this.latestTxId!,
        wallet: TezosToolkit | BeaconWallet = this.wallet
    ) {
        await this.checkAPI();
        const payloadRes = await this.api!.getOperationPayload(txId, type);

        const isSigner = wallet instanceof TezosToolkit;
        const publicKey = isSigner ?
            await (wallet as TezosToolkit).signer.publicKey() :
            (await (wallet as BeaconWallet).client.getActiveAccount())!.publicKey;

        const signature = isSigner ?
            (await (wallet as TezosToolkit).signer.sign(payloadRes.payload)).prefixSig :
            (await (wallet as BeaconWallet).client.requestSignPayload({ payload: payloadRes.payload })).signature;

        const signedRes = await this.api!.saveOperationSignature(
            contractAddress!,
            txId,
            publicKey,
            signature,
            type
        );
        return signedRes;
    }

    public async sendTx(
        type: "approve" | "reject",
        txId: string = this.latestTxId!,
        contractAddress: string | undefined = this.contract?.address,
    ) {
        await this.checkAPI();

        let resTx = await this.api!.getSignedOperation(type, txId);
        resTx.value = JSON.parse(resTx.value);

        if (this.wallet instanceof BeaconWallet) {
            throw new Error("Beacon wallet not supported for sending transactions");
        }

        const tx = await (this.wallet as TezosToolkit).wallet.transfer({
            to: contractAddress!,
            amount: 0,
            parameter: resTx
        }).send();
        await tx.confirmation();
        return tx;
    }
}