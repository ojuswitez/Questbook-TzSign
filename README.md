# Questbook-TzSign

- `tzSignAPI.ts` is the tzSign API wrapper
- `multisig.ts` is the class having the useful fuctions requested [here](https://questbook.notion.site/Integrating-external-safe-with-Questbook-61715e88ef594b90a2b30358bb734137).
  - Currently `createXTZTransaction` exists instead of `createMultiTransaction`
  - Rest is all supported, from creating the multisig to adding the transactions in it, signing them and eventually sending them.
- `index.ts` is used for testing the multisig and demonstrating its use.