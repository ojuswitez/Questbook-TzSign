import { hash } from '@stablelib/blake2b';
import { DefaultContractType, Signer, TezosToolkit } from '@taquito/taquito';
import { b58cdecode, b58cencode, prefix } from '@taquito/utils';
import { TzSignAPI } from './tzSignAPI';


export class TzSign {
    private tezos: TezosToolkit;
    private api: TzSignAPI | undefined;
    private contract: DefaultContractType | undefined;
    private latestTxId: string | undefined;

    constructor(tezos: TezosToolkit, contract?: any) {
        this.tezos = tezos;
        this.contract = contract;
    }

    private async checkAPI() {
        if (!this.api) {
            this.api = new TzSignAPI();
            await this.api.auth(this.tezos);
        }
    }

    public async createMultiSig(
        owners: string[],
        threshold: string,
        balance: number = 0
    ) {
        this.checkAPI();

        const resCode = await this.api!.getContractCode();
        const code = resCode.data;

        const origination = await this.tezos.contract.originate({
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
        this.checkAPI();

        const res = await this.api!.getInitStorage(contractAddress!);
        return res.status === 200;
    }

    public async isOwner(address: string, contractAddress: string | undefined = this.contract?.address) {
        this.checkAPI();

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
        this.checkAPI();

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
        this.checkAPI();

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
        this.checkAPI();

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
        this.checkAPI();

        const txs = await this.api!.getOperations(contractAddress!);
        return txs.find((tx: any) => tx.operation_id === transactionHash);
    }

    public async signTx(
        type: "approve" | "reject",
        contractAddress: string | undefined = this.contract?.address,
        txId: string = this.latestTxId!,
        signer: Signer = this.tezos.signer
    ) {
        this.checkAPI();

        const payloadRes = await this.api!.getOperationPayload(txId, type);
        const signature = (await signer.sign(payloadRes.payload, new Uint8Array())).prefixSig;
        const signedRes = await this.api!.saveOperationSignature(
            contractAddress!,
            txId,
            await signer.publicKey(),
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
        this.checkAPI();

        let resTx = await this.api!.getSignedOperation(type, txId);
        resTx.value = JSON.parse(resTx.value);
        const tx = await this.tezos.wallet.transfer({
            to: contractAddress!,
            amount: 0,
            parameter: resTx
        }).send();
        await tx.confirmation();
        return tx;
    }
}