"use server";

import clientPromise from "@/lib/mongodb";
import Moralis from "moralis";
import Config from "@/config/settings";
import { TellorFlex } from "@/utils/etherjs";
import { socket } from "./socket";

const status = { started: false, capture: false, prevTimeStamp: 0 };

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
  const lastUpdate = await db.collection("reporters").findOne({ address });
  if (!lastUpdate) return;
  let fromBlock = 18371578;
  if (lastUpdate.lastUpdate) fromBlock = lastUpdate.lastUpdate;

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
      block_timestamp: new Date(txs[i].block_timestamp),
      transaction_fee: Number(txs[i].transaction_fee),
      method: txs[i].input.slice(0, 10),
      receipt_status: Number(txs[i].receipt_status),
      trb: transfer
        ? Number(transfer.value_decimal) > 10
          ? 0
          : Number(transfer.value_decimal)
        : 0,
    });
    if (i === 0) {
      await db
        .collection("reporters")
        .findOneAndUpdate(
          { address },
          { $set: { lastUpdate: Number(txs[i].block_number) + 1 } }
        );
    }
  }
};

export const updateReporters = async (reporters: any[]) => {
  if (!status.capture) {
    const socket = require("socket.io-client")("http://95.217.47.46:3000");
    socket.on("NewReport", async (res: any) => {
      const client = await clientPromise;
      const db = client.db("tellor-feed");
      const data = await db
        .collection("reporters")
        .findOne({ address: res.reporter.toLowerCase() });
      if (data) {
        await db
          .collection("reporters")
          .updateOne(
            { address: res.reporter.toLowerCase() },
            { $set: { recents: [res.earning, ...data.recents] } }
          );
      }
    });
    status.capture = true;
  }
  const client = await clientPromise;
  const db = client.db("tellor-feed");
  for (let i = 0; i < reporters.length; i++) {
    const reporter = await db
      .collection("reporters")
      .findOne({ address: reporters[i].id });
    if (!reporter) {
      await db.collection("reporters").insertOne({
        address: reporters[i].id,
        isContract: true,
        isWorking: true,
        lastUpdate: 0,
        recents: [],
        label: "",
      });
    }
  }
  const saved_data = await db.collection("reporters").find().toArray();
  let res = {};
  for (let i = 0; i < saved_data.length; i++) {
    res = {
      ...res,
      [saved_data[i].address]: {
        isContract: saved_data[i].isContract,
        isWorking: saved_data[i].isWorking,
        lastUpdate: saved_data[i].lastUpdate,
        recents: saved_data[i].recents,
        label: saved_data[i].label,
      },
    };
  }
  return res;
};
