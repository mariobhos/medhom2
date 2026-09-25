import { listMedicines, listTreatments } from "@/server/medicines";
import { TreatmentsBoard } from "@/components/TreatmentsBoard";

export const dynamic = "force-dynamic";

export default async function TreatmentsPage() {
  const [treatments, medicines] = await Promise.all([listTreatments(), listMedicines()]);

  return (
    <div className="animate-fade-in">
      <TreatmentsBoard
        treatments={treatments}
        medicines={medicines.map(({ id, name, strength, unit }) => ({ id, name, strength, unit }))}
      />
    </div>
  );
}
