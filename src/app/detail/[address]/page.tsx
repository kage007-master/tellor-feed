"use client";

import { AppDispatch, type RootState } from "@/lib/store";
import { useSelector, useDispatch } from "react-redux";
import { getPrices, getTransactions } from "@/lib/home/homeSlice";
import { useEffect, useState } from "react";
import { Checkbox, Table } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import moment from "moment";
import Config from "@/config/settings";
import { shortenName } from "@/utils/string";
import Link from "next/link";

interface DataType {
  key: React.Key;
  name: string;
  _amount: number;
  _lockedBalance: number;
  gas_price: number;
  receipt_gas_used: number;
  address: string;
  lastTimestamp: number;
  trb: number;
  receipt_status: number;
}

export default function Home({ params }: { params: { address: string } }) {
  const {
    gasPrice,
    ethPrice,
    tellorPrice,
    avaliableEarning,
    totalFee,
    transactions,
    trbBalance,
  } = useSelector((state: RootState) => state.home);
  const dispatch = useDispatch<AppDispatch>();
  const [hideFailed, setHideFailed] = useState(false);

  useEffect(() => {
    dispatch(getPrices());
    dispatch(getTransactions(params.address));
    setInterval(() => {
      dispatch(getPrices());
    }, 12000);
  }, []);

  const columns: TableColumnsType<DataType> = [
    {
      title: "No",
      render: (_v, _d, _index) => _index + 1,
    },
    {
      title: "TxId",
      dataIndex: "hash",
      render: (hash, _v) => (
        <Link
          target="_blank"
          href={`https://etherscan.io/tx/${hash}`}
          className={`${
            Number(_v.receipt_status) === 0 ? "text-[red]" : "text-white"
          }`}
        >
          {shortenName(hash, 12)}
        </Link>
      ),
    },
    {
      title: "Fee",
      dataIndex: "receipt_gas_used",
      sorter: (a, b) =>
        a.receipt_gas_used * a.gas_price - a.receipt_gas_used * a.gas_price,
      render: (receipt_gas_used, _v) =>
        ((receipt_gas_used * _v.gas_price) / 1e18).toFixed(8) +
        " ($" +
        (((receipt_gas_used * _v.gas_price) / 1e18) * ethPrice).toFixed(2) +
        ")",
    },
    {
      title: "Gas Price",
      dataIndex: "gas_price",
      render: (gasPrice) => (gasPrice / 1e9).toFixed(1),
    },
    {
      title: "Reward",
      dataIndex: "trb",
      render: (trb) => trb + "(" + (trb * tellorPrice).toFixed(2) + ")",
    },
    {
      title: "Time",
      dataIndex: "block_timestamp",
      render: (time) => moment(time).fromNow(true),
    },
    {
      title: "Income",
      dataIndex: "trb",
      render: (trb, _v) =>
        (
          trb * tellorPrice -
          ((_v.receipt_gas_used * _v.gas_price) / 1e18) * ethPrice
        ).toFixed(2),
    },
  ];
  return (
    <main className="flex min-h-screen flex-col justify-between">
      <nav className="!z-50 flex gap-2 px-5 py-2 fixed bg-[#aaa] w-full">
        <div>Gas: {(gasPrice / 1e9).toFixed(0)} Gwei</div>
        <div>ETH: {ethPrice}</div>
        <div>TRB: {tellorPrice}</div>
        <div>Current Rewards: {avaliableEarning}</div>
        <div>
          Estimated Earning:{" "}
          {(
            avaliableEarning * tellorPrice -
            ((gasPrice * 272954) / 1e18) * ethPrice
          ).toFixed(2)}
        </div>
      </nav>
      <div className="mx-20 h-full mt-14">
        <div className="w-full flex items-center flex-col">
          <a
            target="blank"
            href={`https://etherscan.io/address/${params.address}`}
          >
            {params.address}
          </a>
          Fee: {(totalFee / 1e18).toFixed(8)} (
          {((totalFee / 1e18) * ethPrice).toFixed(2)}) Reward:{" "}
          {trbBalance.toFixed(2)} ({(trbBalance * tellorPrice).toFixed(2)})
          Earning:{" "}
          {(trbBalance * tellorPrice - (totalFee / 1e18) * ethPrice).toFixed(2)}
        </div>
        <Checkbox
          checked={hideFailed}
          onChange={() => setHideFailed(!hideFailed)}
        >
          Hide Failed
        </Checkbox>
        <Table
          className="mt-5 !z-0 border rounded-md bg-black"
          columns={columns}
          dataSource={
            hideFailed
              ? transactions.filter((tx) => Number(tx.receipt_status) === 1)
              : transactions
          }
          pagination={false}
        />
      </div>
      <footer></footer>
    </main>
  );
}
