import fs from "fs";
import path from "path";
import StickyNavBar from "../components/StickyNavBar";
import PhotoCarousel from "../components/PhotoCarousel";
import WelcomeCard from "../components/WelcomeCard";
import SponsorsSlider from "../components/SponsorsSlider";
import sponsors from "../data/sponsors";
import "../styles/homePage.css";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

// Known small defect fixed in passing (docs/aws-migration-plan.md §11): the
// pre-migration carousel hardcoded 29 image paths by hand. This discovers
// every image in public/event-photos at build time instead, so adding a
// photo to that folder is enough to put it in rotation. Runs at build time
// only (static export), sorted alphabetically for a deterministic order.
function getCarouselImages(): string[] {
  const dir = path.join(process.cwd(), "public", "event-photos");
  const files = fs
    .readdirSync(dir)
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return files.map((file) => `/event-photos/${file}`);
}

export default function HomePage() {
  const carouselImages = getCarouselImages();

  return (
    <div className="Home-Page">
      <StickyNavBar />
      <div className="logo-row">
        <img src="/built-logo-no-background.png" className="home-logo" alt="" />
      </div>
      <div className="welcome-elements">
        <WelcomeCard />
        <PhotoCarousel imageSrcs={carouselImages} />
      </div>

      <h1 className="home-text">Our Sponsors</h1>
      <SponsorsSlider sponsors={sponsors} />
    </div>
  );
}
