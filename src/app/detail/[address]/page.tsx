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
import ReactECharts from "echarts-for-react";

interface DataType {
  key: React.Key;
  name: string;
  gas_price: number;
  transaction_fee: number;
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
      totalFee += txs[i].transaction_fee;
      trbBalance += txs[i].trb;
    }
    return { totalFee, trbBalance };
  };

  const calcStatistic = (txs: any[]) => {
    let total: any = {},
      success: any = {},
      fail: any = {},
      claim: any = {},
      average: any = {},
      trb: any = {};
    for (let i = 0; i < txs.length; i++) {
      const date = moment(txs[i].block_timestamp).format("MM/DD");
      const income =
        txs[i].trb * tellorPrice - txs[i].transaction_fee * ethPrice;
      if (!total[date])
        (total[date] = income),
          (success[date] = fail[date] = claim[date] = 0),
          (trb[date] = txs[i].trb);
      else (total[date] += income), (trb[date] += txs[i].trb);
      if (Number(txs[i].receipt_status) === 1)
        (success[date] += income),
          claim[date]++,
          (average[date] = total[date] / claim[date]);
      else fail[date] += income;
    }
    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["Total", "Success", "Average", "Fail", "Claim", "TRB"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true,
      },
      color: ["#5470c6", "#91cc75", "#37A2FF", "#ee6666", "#9a60b4", "#3ba272"],
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
          data: Object.values(total)
            .reverse()
            .map((val: any) => val.toFixed(2)),
        },
        {
          name: "Success",
          type: "line",
          stack: "Success",
          data: Object.values(success)
            .reverse()
            .map((val: any) => val.toFixed(2)),
        },
        {
          name: "Average",
          type: "line",
          stack: "Average",
          data: Object.values(average)
            .reverse()
            .map((val: any) => val.toFixed(2)),
        },
        {
          name: "Fail",
          type: "line",
          stack: "Fail",
          data: Object.values(fail)
            .reverse()
            .map((val: any) => val.toFixed(2)),
        },
        {
          name: "Claim",
          type: "line",
          stack: "Claim",
          data: Object.values(claim).reverse(),
        },
        {
          name: "TRB",
          type: "line",
          stack: "TRB",
          data: Object.values(trb)
            .reverse()
            .map((val: any) => val.toFixed(2)),
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
      dataIndex: "key",
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
      title: "Method",
      dataIndex: "method",
    },
    {
      title: "Block",
      dataIndex: "block_number",
    },
    {
      title: "Fee",
      dataIndex: "transaction_fee",
      sorter: (a, b) => a.transaction_fee - b.transaction_fee,
      render: (transaction_fee) =>
        transaction_fee.toFixed(8) +
        " ($" +
        (transaction_fee * ethPrice).toFixed(2) +
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
        (trb * tellorPrice - _v.transaction_fee * ethPrice).toFixed(2),
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
        Fee: {totalFee.toFixed(8)} ({(totalFee * ethPrice).toFixed(2)}) Reward:{" "}
        {trbBalance.toFixed(2)} ({(trbBalance * tellorPrice).toFixed(2)})
        Earning: {(trbBalance * tellorPrice - totalFee * ethPrice).toFixed(2)}
      </div>
      <div className="div flex gap-8 items-center">
        <Checkbox
          checked={hideFailed}
          onChange={() => setHideFailed(!hideFailed)}
        >
          Hide Failed
        </Checkbox>
        <div className="flex gap-2 items-center">
          From: <Input style={{ width: "80px" }} size="small" />
          To: <Input style={{ width: "80px" }} size="small" />
          <Button size="small">Search</Button>
        </div>
        <Checkbox checked={viewChart} onChange={() => setViewChart(!viewChart)}>
          <LineChartOutlined />
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
