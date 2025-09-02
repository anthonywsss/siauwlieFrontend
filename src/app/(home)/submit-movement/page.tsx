import MultiStepFormPage from "@/components/FormElements/submit-movement";

export const metadata = {
  title: "Laporkan Pergerakan",
};

export default function Home() {
  return (
    
     <div>
        <h1 className="text-[26px] font-bold leading-[30px] text-dark mb-5"> Laporkan Pergerakan </h1> 
        <div className="space-y-6 rounded-2xlrounded-2xl border border-gray-200 bg-white p-6">
          <MultiStepFormPage />
        </div>
     </div>
  )
}
