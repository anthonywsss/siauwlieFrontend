import { EditIcon, TrashIcon, AddIcon } from "@/assets/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { getDisposalHistory } from "./fetch";
import { DownloadIcon, PreviewIcon } from "./icons";

export async function DisposalHistory() {
/* getDisposalHistory diganti dengan API terbaru nanti*/
  const data = await getDisposalHistory();

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
          {data.map((item, index) => (
            <TableRow key={index} className="border-[#eee] dark:border-dark-3">
              <TableCell className="min-w-[155px] xl:pl-7.5">
                <h5 className="text-dark dark:text-white">{item.id}</h5>
              </TableCell>

              <TableCell>
                <h5 className="text-dark dark:text-white">{item.reason}</h5>
              </TableCell>

              <TableCell>
                <p className="text-dark dark:text-white">
                  {dayjs(item.timestamp).format("MMM DD, YYYY")}
                </p>
              </TableCell>
              
              <TableCell>
                <h5 className="text-gray-7 dark:text-white">{item.disposedby}</h5>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
