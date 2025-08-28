<<<<<<< HEAD
import AllItemsClient from "@/components/Tables/disposal";
=======
import {DisposalHistory} from "@/components/Tables/disposal.client";
>>>>>>> b0e563964f0ccd88fcb34c90a5a0a89885e57706

import { Metadata } from "next";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "All Asset",
=======
  title: "Disposal History",
>>>>>>> b0e563964f0ccd88fcb34c90a5a0a89885e57706
};

export default function Home() {
  return (
    <div className="space-y-6">
<<<<<<< HEAD
      <AllItemsClient />
    </div>
  );
}
=======

      <DisposalHistory />
    </div>
  );
}
>>>>>>> b0e563964f0ccd88fcb34c90a5a0a89885e57706
