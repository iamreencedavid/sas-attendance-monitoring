import { Kiosk } from "@/components/kiosk/Kiosk";
import { MOCK_STAFF } from "@/lib/punch/mock";

export default function Home() {
  return <Kiosk staff={MOCK_STAFF} />;
}
