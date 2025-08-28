<<<<<<< HEAD
import AllItemsClient from "@/components/Tables/all-client";
=======
import SearchBar from "@/components/Search/SearchBar";
import { AllItemsTable } from "@/components/Tables/allitems";
import AllClient from "@/components/Tables/allclient.client";
>>>>>>> b0e563964f0ccd88fcb34c90a5a0a89885e57706

import { Metadata } from "next";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "All Asset",
=======
  title: "All Client",
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

      <AllClient />
    </div>
  );
}
>>>>>>> b0e563964f0ccd88fcb34c90a5a0a89885e57706
