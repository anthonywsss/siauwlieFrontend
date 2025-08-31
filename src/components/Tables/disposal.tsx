"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import API from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RawDisposal = {
  id?: number | string;
  asset_id?: string;
  disposed_at?: string;
  disposed_by?: string;
  reason?: string;
};

export default function DisposalHistory() {
  const [data, setData] = useState<RawDisposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisposals = async () => {
      try {
        const res = await API.get("/disposal-history"); 
        setData(res.data?.data ?? []);
      } catch (err) {
        console.error("Error fetching disposals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDisposals();
  }, []);

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[155px] xl:pl-7.5">Container ID</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Disposed by</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6">
                No data available
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={index} className="border-[#eee] dark:border-dark-3">
                <TableCell className="min-w-[155px] xl:pl-7.5">
                  <h5 className="text-dark dark:text-white">{item.asset_id ?? "-"}</h5>
                </TableCell>

                <TableCell>
                  <h5 className="text-dark dark:text-white">{item.reason ?? "-"}</h5>
                </TableCell>

                <TableCell>
                  <p className="text-dark dark:text-white">
                    {item.disposed_at ? dayjs(item.disposed_at).format("MMM DD, YYYY") : "-"}
                  </p>
                </TableCell>

                <TableCell>
                  <h5 className="text-gray-7 dark:text-white">{item.disposed_by ?? "-"}</h5>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
