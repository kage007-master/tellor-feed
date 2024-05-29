"use client";

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import Moralis from "moralis";
import Config from "@/config/settings";
import { getGasUsage } from "@/utils/moralis";
import { getLastestSubmissionTimestamp, getCode } from "@/utils/etherjs";

const status = { started: false };

export interface CounterState {
  recentEarnings: any[];
  gasPrice: number;
  tellorPrice: number;
  ethPrice: number;
  reporters: any[];
  lastTimeStamp: number;
  reportersData: any;
}

const initialState: CounterState = {
  recentEarnings: [],
  gasPrice: 0,
  tellorPrice: 105,
  ethPrice: 4000,
  reporters: [],
  lastTimeStamp: 0,
  reportersData: {},
};

export const getLastTimestamp = createAsyncThunk(`getPrices`, async () => {
  try {
    return {
      lastTimeStamp: await getLastestSubmissionTimestamp(),
    };
  } catch (e) {
    console.error(e);
  }
});

export const getReporters = createAsyncThunk(`getReporters`, async () => {
  try {
    const { data } = await axios.post(Config.SUBGRAPH_URL, {
      query: `{
      newStakers(where: {_amount_gte: "100000000000000000000"}) {
        id
        _staker
        _amount
        _lockedBalance
        blockNumber
        blockTimestamp
        lastTimestamp
      }
    }`,
    });
    let reporters = [];
    for (let i = 0; i < data.data.newStakers.length; i++) {
      reporters.push({
        ...data.data.newStakers[i],
        key: data.data.newStakers[i].id,
      });
    }
    return reporters;
  } catch (e) {
    console.error(e);
  }
});

export const getRecentEarnings = createAsyncThunk(
  `getRecentEarnings`,
  async () => {
    try {
      if (!status.started) {
        status.started = true;
        await Moralis.start({ apiKey: Config.MORALIS_APIKEY });
      }

      const response = await Moralis.EvmApi.token.getWalletTokenTransfers({
        chain: "0x1",
        limit: 10,
        order: "DESC",
        address: Config.CONTRACT_ADDRESS,
      });

      const response1 = await Moralis.EvmApi.transaction.getWalletTransactions({
        chain: "0x1",
        limit: 10,
        order: "DESC",
        address: Config.CONTRACT_ADDRESS,
      });

      const filtered = response.raw.result.filter((tx) => {
        return tx.to_address.toLocaleLowerCase() !== Config.CONTRACT_ADDRESS;
      });

      const withGasUage = [];
      for (let i = 0; i < filtered.length; i++) {
        const tx: any = response1.raw.result.find(
          (txID) => txID.hash === filtered[i].transaction_hash
        );
        withGasUage.push({
          ...filtered[i],
          fee: tx
            ? tx.transaction_fee
            : await getGasUsage(filtered[i].transaction_hash),
        });
      }

      return withGasUage;
    } catch (e) {
      console.error(e);
    }
  }
);

export const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    getLastEarnings: (state, { payload }) => {
      state.recentEarnings = [
        {
          transaction_hash: payload.res.transactionHash,
          to_address: payload._reporter.toLocaleLowerCase(),
          value_decimal: payload.earning,
          fee:
            (Number(payload.res.gasUsed) *
              Number(payload.res.effectiveGasPrice)) /
            1e18,
        },
        ...state.recentEarnings,
      ];
      const idx = state.reporters.findIndex(
        (reporter: any) =>
          reporter.id.toLocaleLowerCase() ===
          payload._reporter.toLocaleLowerCase()
      );
      if (idx != -1) state.reporters[idx].lastTimestamp = Number(payload._time);

      let address = payload._reporter.toLocaleLowerCase();
      state.reportersData = {
        ...state.reportersData,
        [address]: {
          ...state.reportersData[address],
          recents: [
            payload.earning,
            ...state.reportersData[address].recents,
          ].slice(0, 10),
        },
      };
    },
    setPrices: (state, { payload }) => {
      state.ethPrice = payload.ethusdt;
      state.tellorPrice = payload.trbusdt;
      state.gasPrice = payload.gasPrice;
    },
    setReportersData: (state, { payload }) => {
      state.reportersData = payload;
    },
    setLastTimestamp: (state, { payload }) => {
      state.lastTimeStamp = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getRecentEarnings.pending, (state) => {});
    builder.addCase(getRecentEarnings.fulfilled, (state, { payload }) => {
      if (payload) state.recentEarnings = payload;
    });
    builder.addCase(getRecentEarnings.rejected, (state) => {});
    builder.addCase(getLastTimestamp.pending, (state) => {});
    builder.addCase(getLastTimestamp.fulfilled, (state, { payload }) => {
      if (payload) {
        state.lastTimeStamp = payload.lastTimeStamp;
      }
    });
    builder.addCase(getLastTimestamp.rejected, (state) => {});
    builder.addCase(getReporters.pending, (state) => {});
    builder.addCase(getReporters.fulfilled, (state, { payload }) => {
      if (payload) state.reporters = payload;
    });
    builder.addCase(getReporters.rejected, (state) => {});
  },
});

export default counterSlice.reducer;

export const {
  getLastEarnings,
  setPrices,
  setReportersData,
  setLastTimestamp,
} = counterSlice.actions;
