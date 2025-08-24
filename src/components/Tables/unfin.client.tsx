import { EditIcon, TrashIcon, AddIcon } from "@/assets/icons";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUnfinDeliv } from "./fetch";
import { PreviewIcon } from "./icons";
import dayjs from "dayjs";
import React from "react";

type Item = {
  status: string;
};

export async function UnfinDelivery() {
/* getUnfinDeliv diganti dengan API terbaru nanti*/
  const data = await getUnfinDeliv();


  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
        <h1 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white mb-5">Pengiriman Belum Tuntas </h1> 
        
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[20px] xl:pl-3">Asset ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Klien</TableHead>
            <TableHead>Waktu Pencacatan</TableHead>
            <TableHead>Foto</TableHead>
            <TableHead>Riwayat</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className="border-[#eee] dark:border-dark-3">
              <TableCell className="min-w-[20px] xl:pl-3">
                <h5 className="text-dark dark:text-white">{item.id}</h5>
              </TableCell>

              <TableCell>
                <h5 className="text-dark dark:text-white">{item.user}</h5>
              </TableCell>

              <TableCell>
                <h5 className="text-dark dark:text-white">{item.status}</h5>
                {/* ini gimana bikin badge warna warni */}
              </TableCell>

              <TableCell>
                <h5 className="text-gray-7 dark:text-white">{item.klien}</h5>
              </TableCell>

              <TableCell>
                <p className="text-dark dark:text-white">
                   {dayjs(item.waktu).format("MMM DD, YYYY")}
                </p>
              </TableCell>

              <TableCell>
                <a href={item.foto} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-2">
                  <PreviewIcon />
                  <span>Pratinjau</span>
                 </a>
              </TableCell>

              <TableCell>
                <a href={item.riwayat}>
                  <button className="flex items-center justify-center w-fit px-4 py-2 text-md font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg active:bg-purple-600 hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple mb-6 mt-6">
                    Cek Riwayat
                  </button>
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
