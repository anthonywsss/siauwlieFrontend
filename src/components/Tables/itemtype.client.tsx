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
import { getAssetTypeData } from "./fetch";
import { DownloadIcon, PreviewIcon } from "./icons";

export async function ItemType() {
/* getAssetTypeData diganti dengan API terbaru nanti*/
  const data = await getAssetTypeData();

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
        <button className="flex items-center justify-center w-70 px-4 py-2 text-md font-bold leading-5 text-white transition-colors duration-150 bg-primary border border-transparent rounded-lg active:bg-purple-600 hover:bg-purple-700 focus:outline-none focus:shadow-outline-purple mb-6">
            <AddIcon /> Add New Categories
        </button>
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[155px] xl:pl-7.5">Asset ID</TableHead>
            <TableHead>Asset Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right xl:pr-7.5">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className="border-[#eee] dark:border-dark-3">
              <TableCell className="min-w-[155px] xl:pl-7.5">
                <h5 className="text-dark dark:text-white">{item.id}</h5>
              </TableCell>

              <TableCell>
                <h5 className="text-dark dark:text-white">{item.assetname}</h5>
              </TableCell>

              <TableCell>
                <h5 className="text-gray-7 dark:text-white">{item.desc}</h5>
              </TableCell>
              <TableCell className="xl:pr-7.5">
                <div className="flex items-center justify-end gap-x-3.5">
                  <button className="hover:text-primary">
                    <span className="sr-only">Edit </span>
                    <EditIcon />
                  </button>
                  <button className="hover:text-red">
                    <span className="sr-only">Delete </span>
                    <TrashIcon />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
