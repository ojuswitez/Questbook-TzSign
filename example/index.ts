import * as dotenv from 'dotenv'
import { TzSign } from '../src/multisig';
import { TzSignAPI } from '../src/tzSignAPI';
import { initWallet } from '../src/wallet';


const main = async () => {
    const wallet = await initWallet();
    const api = new TzSignAPI();

    // Authenticate from TzSign API
    const auth_tokens = await api.auth(wallet);
    console.log(auth_tokens);

    // Initialize TzSign
    const tzSign = new TzSign(wallet, api, await wallet.contract.at('KT1Bzxs2ubi8dD6C1o51ATX6gwJJMxLQKT6s'));

    // Deploy Multisig contract
    const multisig = await tzSign.createMultiSig(
        process.env.MULTISIG_OWNERS?.split(',')!,
        process.env.MULTISIG_THRESHOLD!,
        10
    )
    console.log(multisig);

    // Check if valid safe address
    const isValid1 = await tzSign.isValidSafeAddress('KT1Hk6JQ8ZRRvdzjobyfVNsAeSC6PScjfQ8x');
    const isValid2 = await tzSign.isValidSafeAddress(multisig!.address);
    console.log(isValid1, isValid2);

    // Check if owner
    const isOwner1 = await tzSign.isOwner('tz1burnburnburnburnburnburnburjAYjjX');
    const isOwner2 = await tzSign.isOwner(await wallet.signer.publicKeyHash());
    console.log(isOwner1, isOwner2);

    // Create an XTZ transaction for 1 XTZ
    const tx = await tzSign.createXTZTransaction(1000000, 'tz1burnburnburnburnburnburnburjAYjjX');
    console.log(tx);

    // Sign the transaction
    const signedTx = await tzSign.signTx("approve");
    console.log(signedTx);

    // Get transaction hash status
    let txInfo = await tzSign.getTransactionHashStatus(tx.operation_id);
    console.log(txInfo);

    // Send the final transaction
    const finalTx = await tzSign.sendTx("approve");
    console.log(finalTx);

    // Get transaction hash status
    txInfo = await tzSign.getTransactionHashStatus(tx.operation_id);
    console.log(txInfo);
}

try {
    dotenv.config()
    main();
} catch (e) {
    console.log(e);
}
