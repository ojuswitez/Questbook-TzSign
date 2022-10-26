import axios, { Axios } from "axios";
import { TezosToolkit } from "@taquito/taquito"
import { TransferXTZ, TransferFA1_2, TransferFA2 } from "./types"


export class TzSignAPI {
    private readonly tzSignApi: Axios;
    private readonly tzktApi: Axios;
    private readonly network: string;
    private access_token: string | undefined;
    private refresh_token: string | undefined;

    constructor() {
        this.network = process.env.NETWORK!;
        this.tzSignApi = axios.create({
            baseURL: process.env.TZSIGN_API,
            timeout: 30000,
            withCredentials: true,
            // responseType: 'json',
        });
        this.tzktApi = axios.create({
            baseURL: process.env.TZKT_API,
            timeout: 30000,
            responseType: 'json',
        });
    }

    async getContractCode() {
        return this.tzSignApi.get('/static/contract.json');
    };

    async auth(wallet: TezosToolkit) {
        const signer = wallet.signer
        const publicKey = await signer.publicKey();

        const payload = await this.tzSignApi.post(`/${this.network}/auth/request`, {
            "pub_key": publicKey
        })
        const { token } = payload.data;
        const tokenBytes = Buffer.from(token, 'utf8').toString('hex');
        const tokenBytesLen = Buffer.from(`${tokenBytes.length}`, 'utf8').toString('hex');
        const signPayload = `050100${tokenBytesLen}${tokenBytes}`;

        const signature = await signer.sign(signPayload);

        const resTokens = await this.tzSignApi.post(`/${this.network}/auth`, {
            pub_key: publicKey,
            payload: token,
            signature: signature.prefixSig,
        });
        this.access_token = resTokens.data.access_token;
        this.refresh_token = resTokens.data.refresh_token;
        return {
            access_token: this.access_token,
            refresh_token: this.refresh_token
        };
    }

    async getInitStorage(contractAddress: string) {
        return await this.tzktApi.get(`/contracts/${contractAddress}/storage`);
    }

    async createOperation(params: TransferXTZ | TransferFA1_2 | TransferFA2) {
        const resTx = await this.tzSignApi.post(
            `/${this.network}/contract/operation`,
            params,
            { headers: { Authorization: `Bearer ${this.access_token}` } }
        );
        return resTx.data;
    }

    async getOperations(contract_id: string) {
        let ops: Array<any> = [];
        let page = [];
        let offset = 0;
        do {
            const resOps = await this.tzSignApi.get(
                `${this.network}/contract/${contract_id}/operations?limit=500&offset=${offset}`,
                { headers: { Authorization: `Bearer ${this.access_token}` } }
            );
            page = resOps.data;
            ops = ops.concat(page);
            offset += page.length;
        } while (page.length != 0);
        return ops;
    }

    async getOperationPayload(operation_id: string, type: "approve" | "reject") {
        const payload = await this.tzSignApi.get(
            `/${this.network}/contract/operation/${operation_id}/payload?type=${type}`,
            { headers: { Authorization: `Bearer ${this.access_token}` } }
        );
        return payload.data;
    }

    async saveOperationSignature(
        contract_id: string,
        operation_id: string,
        pub_key: string,
        signature: string,
        type: string
    ) {
        const res = await this.tzSignApi.post(`/${this.network}/contract/operation/${operation_id}/signature`, {
            contract_id: contract_id,
            pub_key: pub_key,
            signature: signature,
            type: type
        }, { headers: { Authorization: `Bearer ${this.access_token}` } });
        return res.data;
    }

    async getSignedOperation(type: "approve" | "reject", operation_id: string) {
        const res = await this.tzSignApi.get(
            `/${this.network}/contract/operation/${operation_id}/build?type=${type}`, {
            headers: { Authorization: `Bearer ${this.access_token}` }
        });
        return res.data;
    }
}