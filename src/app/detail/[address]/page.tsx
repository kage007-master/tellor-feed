"use client";

import { type RootState } from "@/lib/store";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { Checkbox, Table, Input, Button } from "antd";
import type { TableColumnsType } from "antd";
import moment from "moment";
import { shortenName } from "@/utils/string";
import Link from "next/link";
import { LineChartOutlined, SyncOutlined } from "@ant-design/icons";
import getData, { updateTxs } from "@/lib/action";
import { getBlockNumber } from "@/utils/etherjs";
import Config from "@/config/settings";
import ReactECharts from "echarts-for-react";

interface DataType {
  key: React.Key;
  name: string;
  gas_price: number;
  receipt_gas_used: number;
  address: string;
  trb: number;
  receipt_status: number;
  block_number: number;
}

export default function Home({ params }: { params: { address: string } }) {
  const { ethPrice, tellorPrice } = useSelector(
    (state: RootState) => state.home
  );
  const [hideFailed, setHideFailed] = useState(false);
  const [viewChart, setViewChart] = useState(false);
  const [txs, setTxs] = useState<any>([]);
  const [loading, setLoading] = useState(false);

  const calcFee = (txs: any[]) => {
    let totalFee = 0; //params.address === Config.MY_ADDRESS ? 94521080000000000 : 0;
    let trbBalance = 0;
    for (var i = 0; i < txs.length; i++) {
      totalFee += Number(txs[i].receipt_gas_used) * Number(txs[i].gas_price);
      trbBalance += txs[i].trb;
    }
    return { totalFee, trbBalance };
  };

  const calcStatistic = (txs: any[]) => {
    let total: any = {},
      success: any = {},
      fail: any = {},
      claim: any = {};
    for (let i = 0; i < txs.length; i++) {
      const date = moment(txs[i].block_timestamp).format("MM/DD");
      const income =
        txs[i].trb * tellorPrice -
        ((txs[i].receipt_gas_used * txs[i].gas_price) / 1e18) * ethPrice;
      if (!total[date])
        (total[date] = income), (success[date] = fail[date] = claim[date] = 0);
      else total[date] += income;
      if (Number(txs[i].receipt_status) === 1)
        (success[date] += income), claim[date]++;
      else fail[date] += income;
    }
    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["Total", "Success", "Fail", "Claim"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      color: ["#5470c6", "#91cc75", "#ee6666", "#9a60b4"],
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: Object.keys(total).reverse(),
      },
      yAxis: {
        type: "value",
      },
      series: [
        {
          name: "Total",
          type: "line",
          stack: "Total",
          data: Object.values(total).reverse(),
        },
        {
          name: "Success",
          type: "line",
          stack: "Success",
          data: Object.values(success).reverse(),
        },
        {
          name: "Fail",
          type: "line",
          stack: "Fail",
          data: Object.values(fail).reverse(),
        },
        {
          name: "Claim",
          type: "line",
          stack: "Claim",
          data: Object.values(claim).reverse(),
        },
      ],
    };
  };

  const { totalFee, trbBalance } = calcFee(txs);

  useEffect(() => {
    (async () => {
      setTxs(await getData(params.address));
    })();
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
      title: "Block",
      dataIndex: "block_number",
    },
    {
      title: "Fee",
      dataIndex: "receipt_gas_used",
      sorter: (a, b) =>
        a.receipt_gas_used * a.gas_price - b.receipt_gas_used * b.gas_price,
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
      render: (trb) =>
        trb.toFixed(2) + "(" + (trb * tellorPrice).toFixed(2) + ")",
    },
    {
      title: "Time",
      dataIndex: "block_timestamp",
      render: (time) => moment(time).format("HH:mm MM/DD"),
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
      <div className="div flex gap-4 items-center">
        <Checkbox
          checked={hideFailed}
          onChange={() => setHideFailed(!hideFailed)}
        >
          Hide Failed
        </Checkbox>
        <div className="flex gap-2 items-center">
          From: <Input style={{ width: "20%" }} size="small" />
          To: <Input style={{ width: "20%" }} size="small" />
          <Button size="small">Search</Button>
        </div>
        <Checkbox checked={viewChart} onChange={() => setViewChart(!viewChart)}>
          View Chart
        </Checkbox>
        <Button
          className="ml-auto"
          type="primary"
          size="small"
          shape="circle"
          disabled={loading}
          icon={<SyncOutlined />}
          onClick={async () => {
            setLoading(true);
            await updateTxs(params.address, await getBlockNumber());
            setTxs(await getData(params.address));
            setLoading(false);
          }}
        />
      </div>
      {viewChart && <ReactECharts option={calcStatistic(txs)} />}
      <Table
        className="mt-5 !z-0 border rounded-md bg-black"
        columns={columns}
        loading={loading}
        dataSource={
          hideFailed
            ? txs.filter((tx: any) => Number(tx.receipt_status) === 1)
            : txs
        }
        pagination={false}
      />
    </div>
  );
}
