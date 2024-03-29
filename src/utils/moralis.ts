import Moralis from "moralis";

export const getGasUsage = async (txid: string) => {
  const response = await Moralis.EvmApi.transaction.getTransaction({
    chain: "0x1",
    transactionHash: txid,
  });
  return (
    (Number(response?.raw.receipt_gas_used) * Number(response?.raw.gas_price)) /
    1e18
  );
};
