"use server";

import clientPromise from "@/lib/mongodb";
import Moralis from "moralis";
import Config from "@/config/settings";

const status = { started: false };

export default async (address: string) => {
  const client = await clientPromise;
  const db = client.db("tellor-feed");
  const transactions = await db
    .collection("transactions")
    .find({ address })
    .toArray();
  return transactions
    .map((tx) => {
      return {
        address: tx.address,
        key: tx.key,
        gas_price: tx.gas_price,
        block_number: Number(tx.block_number),
        transaction_fee: tx.transaction_fee,
        method: tx.method,
        block_timestamp: tx.block_timestamp,
        receipt_status: tx.receipt_status,
        trb: tx.trb,
      };
    })
    .sort((a, b) => b.block_number - a.block_number);
};

export const updateTxs = async (address: string, block_number: number) => {
  if (!status.started) {
    status.started = true;
    await Moralis.start({ apiKey: Config.MORALIS_APIKEY2 });
  }

  const client = await clientPromise;
  const db = client.db("tellor-feed");
  const lastUpdate = await db.collection("update-info").findOne({ address });
  let fromBlock = 18371578;
  if (lastUpdate) fromBlock = lastUpdate.blockNumber;

  let txs: any[] = [],
    transfers: any[] = [];

  let blockNumber = block_number;
  while (1) {
    const response = await Moralis.EvmApi.transaction.getWalletTransactions({
      chain: "0x1",
      limit: 100,
      order: "DESC",
      toBlock: blockNumber,
      fromBlock,
      address: address,
    });
    txs = [...txs, ...response.raw.result];
    if (response.raw.result.length === 0) break;
    blockNumber =
      Number(response.raw.result[response.raw.result.length - 1].block_number) -
      1;
  }

  blockNumber = block_number;
  while (1) {
    const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
      chain: "0x1",
      limit: 100,
      order: "DESC",
      toBlock: blockNumber,
      fromBlock,
      address: address,
    });
    transfers = [...transfers, ...response.raw.result];
    if (response.raw.result.length === 0) break;
    blockNumber =
      Number(response.raw.result[response.raw.result.length - 1].block_number) -
      1;
  }

  for (let i = 0; i < txs.length; i++) {
    const transfer = transfers.find((txID) => {
      return (
        txs[i].hash === txID.transaction_hash &&
        txID.from_address === Config.CONTRACT_ADDRESS
      );
    });
    await db.collection("transactions").insertOne({
      address,
      key: txs[i].hash,
      gas_price: Number(txs[i].gas_price),
      block_number: Number(txs[i].block_number),
      block_timestamp: txs[i].block_timestamp,
      transaction_fee: txs[i].transaction_fee,
      method: txs[i].input.slice(0, 10),
      receipt_status: Number(txs[i].receipt_status),
      trb: transfer
        ? Number(transfer.value_decimal) > 10
          ? 0
          : Number(transfer.value_decimal)
        : 0,
    });
    if (i === 0) {
      if (fromBlock === 18371578)
        await db
          .collection("update-info")
          .insertOne({ address, blockNumber: Number(txs[i].block_number) + 1 });
      else
        await db
          .collection("update-info")
          .findOneAndUpdate(
            { address },
            { $set: { blockNumber: Number(txs[i].block_number) + 1 } }
          );
    }
  }
};
