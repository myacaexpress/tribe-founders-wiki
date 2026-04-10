import { getData } from "@/lib/get-data";
import HomeClient from "@/app/components/HomeClient";

export default async function Home() {
  const data = await getData();

  return (
    <HomeClient
      radarItems={data.radarItems}
      groupTableItems={data.groupTableItems}
      laneItems={data.laneItems}
      taskItems={data.taskItems}
      businessStateSentence={data.businessStateSentence}
    />
  );
}
