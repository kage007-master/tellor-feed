import Moralis from "moralis";

export const getGasUsage = async (txid: string) => {
  const response: any = await Moralis.EvmApi.transaction.getTransaction({
    chain: "0x1",
    transactionHash: txid,
  });
  return response?.raw.transaction_fee;
};
