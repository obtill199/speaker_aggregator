import { SoundRoomApp } from "@/components/sound-room-app";
import { DEMO_LISTINGS } from "@/lib/data/demo";

export default function Home() {
  return <SoundRoomApp initialListings={DEMO_LISTINGS} />;
}
