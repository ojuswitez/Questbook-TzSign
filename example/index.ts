import { TezosToolkit } from '@taquito/taquito';
import * as dotenv from 'dotenv'
import { TzSign } from '../src/multisig';
import { initWallet } from './wallet';


export const testCases = [
    // 'newMultiSig',
    // 'isValidSafeAddress',
    // 'isOwner',
    'XTZTransaction',
    // 'createFA1_2Transaction',
    // 'createFA2Transaction',
    'getTransactionHashStatus',
]


export const tests = async (tezos: TezosToolkit, testCases: string[]) => {
    const tzSign = new TzSign(tezos, await tezos.contract.at('KT1Bzxs2ubi8dD6C1o51ATX6gwJJMxLQKT6s'));

    if (testCases.includes('newMultiSig')) {
        const multisig = await tzSign.createMultiSig(
            process.env.MULTISIG_OWNERS?.split(',')!,
            process.env.MULTISIG_THRESHOLD!,
            10
        )
        console.log(multisig);
    }

    if (testCases.includes('isValidSafeAddress')) {
        const isValid1 = await tzSign.isValidSafeAddress('KT1Hk6JQ8ZRRvdzjobyfVNsAeSC6PScjfQ8x');
        const isValid2 = await tzSign.isValidSafeAddress('KT1Bzxs2ubi8dD6C1o51ATX6gwJJMxLQKT6s');
        console.log(isValid1, isValid2);
    }

    if (testCases.includes('isOwner')) {
        const isOwner1 = await tzSign.isOwner('tz1burnburnburnburnburnburnburjAYjjX');
        const isOwner2 = await tzSign.isOwner(await tezos.signer.publicKeyHash());
        console.log(isOwner1, isOwner2);
    }

    let tx: any;
    if (
        testCases.includes('XTZTransaction') ||
        testCases.includes('createFA1_2Transaction') ||
        testCases.includes('createFA2Transaction')
    ) {
        if (testCases.includes('XTZTransaction')) {
            tx = await tzSign.createXTZTransaction(1, 'tz1burnburnburnburnburnburnburjAYjjX');
            console.log(tx);
        }
        else if (testCases.includes('createFA1_2Transaction')) {
            tx = await tzSign.createFA1_2Transaction(
                'KT1F8Ei743RE8wH4BEdpq2uuqoHgb6jkfuJe',
                [
                    {
                        "to": "tz1burnburnburnburnburnburnburjAYjjX",
                        "amount": 1
                    }
                ]
            );
            console.log(tx);
        }
        else if (testCases.includes('createFA2Transaction')) {
            tx = await tzSign.createFA2Transaction(
                'KT1Uw1oio434UoWFuZTNKFgt5wTM9tfuf7m7',
                [
                    {
                        "to": "tz1burnburnburnburnburnburnburjAYjjX",
                        "amount": 1,
                        "token_id": 6
                    }
                ]
            );
            console.log(tx);
        }

        const signedTx = await tzSign.signTx("approve");
        console.log(signedTx);

        const finalTx = await tzSign.sendTx("approve");
        console.log(finalTx);

    }
    if (testCases.includes('getTransactionHashStatus')) {
        const txInfo = await tzSign.getTransactionHashStatus(tx.operation_id);
        console.log(txInfo);
    }
}


const main = async () => {
    dotenv.config();
    tests(
        await initWallet(),
        testCases
    );
}


try {
    main();
} catch (e) {
    console.log(e);
}
