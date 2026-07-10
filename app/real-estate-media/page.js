import { RemNoirLanding } from "@/components/real-estate-media/RemNoirLanding";
import styles from "./real-estate-media.module.css";

export const metadata = {
  title: "Real Estate Media OS | StudioFlows",
  description:
    "For real estate media companies where listing jobs still route through the owner. See how StudioFlows runs booking, crew, field updates, editing, delivery, and payments from one workspace.",
};

export default function RealEstateMediaPage() {
  return (
    <div className={styles.landing}>
      <RemNoirLanding />
    </div>
  );
}
