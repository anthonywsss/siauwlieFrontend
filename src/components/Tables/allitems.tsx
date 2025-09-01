import { CheckIcon, TrashIcon } from "@/assets/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getInvoiceTableData } from "./fetch";
import { DownloadIcon, PreviewIcon } from "./icons";

export async function AllItemsTable() {
  // NOTE: nanti rename getInvoiceTableData -> getAllItemsData di ./fetch kalo update api
  const data = await getInvoiceTableData();

  return (
    <div className="rounded-[10px] border border-stroke bg-white p-4 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card sm:p-7.5">
      <h1 className="text-[26px] font-bold leading-[30px] text-dark mb-5"> Pengiriman Belum Tuntas </h1> 
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-[#F7F9FC] dark:bg-dark-2 [&>th]:py-4 [&>th]:text-base [&>th]:text-dark [&>th]:dark:text-white">
            <TableHead className="min-w-[110px] xl:pl-7.5">Id</TableHead>
            <TableHead className="min-w-[120px]">QR Code</TableHead>
            <TableHead className="min-w-[150px]">Status</TableHead>
            <TableHead className="min-w-[200px]">Client Name</TableHead>
            <TableHead className="min-w-[120px]">Client ID</TableHead>
            <TableHead className="min-w-[120px]">Photo</TableHead>
            <TableHead className="min-w-[140px]">Asset Type</TableHead>
            <TableHead className="text-right xl:pr-7.5">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item: any, index: number) => {
            const id = item.id ?? item.code ?? item.name ?? `ITEM-${index + 1}`;
            const qrUrl = item.qrUrl ?? item.qr_link ?? item.qr ?? "#";
            const status = item.status ?? item.state ?? "Unknown";
            const clientName = item.clientName ?? item.client?.name ?? item.client_name ?? "-";
            const clientId = item.clientId ?? item.client?.id ?? item.client_id ?? "-";
            const photoUrl = item.photoUrl ?? item.photo ?? item.image ?? "#";
            const assetType = item.assetType ?? item.type ?? "-";

            const statusClass = cn(
              "max-w-fit rounded-full px-3.5 py-1 text-sm font-medium",
              {
                "bg-[#DFF7E0] text-[#2E8A2E]": /warehouse|at warehouse|available/i.test(status),
                "bg-[#FFA70B]/[0.08] text-[#FFA70B]": /pending/i.test(status),
                "bg-[#D34053]/[0.08] text-[#D34053]": /missing|lost|unpaid|error/i.test(status),
                "bg-[#F3F4F6] text-[#374151]": status === "Unknown",
              },
            );

            return (
              <TableRow key={index} className="border-[#eee] dark:border-dark-3">
                <TableCell className="min-w-[110px] xl:pl-7.5">
                  <h5 className="text-dark dark:text-white text-lg font-medium">{id}</h5>
                </TableCell>

                {/* QR Code Preview */}
                <TableCell>
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <PreviewIcon />
                    <span>Preview</span>
                  </a>
                </TableCell>

                <TableCell>
                  <div className={statusClass}>{status}</div>
                </TableCell>

                <TableCell>
                  <p className="text-dark dark:text-white">{clientName}</p>
                </TableCell>

                <TableCell>
                  <p className="text-dark dark:text-white font-medium">{clientId}</p>
                </TableCell>

                {/* Photo Preview */}
                <TableCell>
                  <a
                    href={photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <PreviewIcon />
                    <span>Preview</span>
                  </a>
                </TableCell>

                <TableCell>
                  <p className="font-semibold text-dark dark:text-white">{assetType}</p>
                </TableCell>

                <TableCell className="xl:pr-7.5">
                  <div className="flex items-center justify-end gap-x-3.5">
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-[#1E90FF] px-4 py-2 text-white shadow-sm hover:bg-[#1677d4]"
                      type="button"
                    >
                      View History
                    </button>


                    <button className="p-2 hover:text-primary" aria-label="Edit item">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    <button className="p-2 hover:text-red-600" aria-label="Delete item">
                      <TrashIcon />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
