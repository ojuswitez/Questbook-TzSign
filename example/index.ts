import * as dotenv from 'dotenv'
import { TzSign } from '../src/multisig';
import { TzSignAPI } from '../src/tzSignAPI';
import { initWallet } from '../src/wallet';


const main = async (tests: string[]) => {
    const wallet = await initWallet();
    const api = new TzSignAPI();

    // Authenticate from TzSign API
    const auth_tokens = await api.auth(wallet);
    console.log(auth_tokens);

    // Initialize TzSign
    const tzSign = new TzSign(wallet, api, await wallet.contract.at('KT1Bzxs2ubi8dD6C1o51ATX6gwJJMxLQKT6s'));

    if (tests.includes('newMultiSig')) {
        const multisig = await tzSign.createMultiSig(
            process.env.MULTISIG_OWNERS?.split(',')!,
            process.env.MULTISIG_THRESHOLD!,
            10
        )
        console.log(multisig);
    }

    if (tests.includes('isValidSafeAddress')) {
        const isValid1 = await tzSign.isValidSafeAddress('KT1Hk6JQ8ZRRvdzjobyfVNsAeSC6PScjfQ8x');
        const isValid2 = await tzSign.isValidSafeAddress('KT1Bzxs2ubi8dD6C1o51ATX6gwJJMxLQKT6s');
        console.log(isValid1, isValid2);
    }

    if (tests.includes('isOwner')) {
        const isOwner1 = await tzSign.isOwner('tz1burnburnburnburnburnburnburjAYjjX');
        const isOwner2 = await tzSign.isOwner(await wallet.signer.publicKeyHash());
        console.log(isOwner1, isOwner2);
    }

    let tx: any;
    if (
        tests.includes('XTZTransaction') ||
        tests.includes('createFA1_2Transaction') ||
        tests.includes('createFA2Transaction')
    ) {
        if (tests.includes('XTZTransaction')) {
            tx = await tzSign.createXTZTransaction(1, 'tz1burnburnburnburnburnburnburjAYjjX');
            console.log(tx);
        }
        else if (tests.includes('createFA1_2Transaction')) {
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
        else if (tests.includes('createFA2Transaction')) {
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
    if (tests.includes('getTransactionHashStatus')) {
        const txInfo = await tzSign.getTransactionHashStatus(tx.operation_id);
        console.log(txInfo);
    }
}

try {
    dotenv.config();
    main([
        // 'newMultiSig',
        // 'isValidSafeAddress',
        // 'isOwner',
        // 'XTZTransaction',
        // 'createFA1_2Transaction',
        // 'createFA2Transaction',
        // 'getTransactionHashStatus',
    ]);
} catch (e) {
    console.log(e);
}
