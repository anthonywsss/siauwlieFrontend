import MultiStepFormPage from "@/components/FormElements/submit-movement";

export const metadata = {
  title: "Laporan Pergerakan",
};

export default function Home() {
  return (
    
     <div> 
        <div className="space-y-6 rounded-2xlrounded-2xl border border-gray-200 bg-white p-6">
          <MultiStepFormPage />
        </div>
     </div>
  )
}
