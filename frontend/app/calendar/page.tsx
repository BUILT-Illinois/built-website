import StickyNavBar from "../../components/StickyNavBar";
import EmbGoogleCal from "../../components/EmbGoogleCal";
import "../../styles/calendarPage.css";

export default function CalendarPage() {
  return (
    <div className="Calendar-Page">
      <StickyNavBar />
      <h1>Calendar</h1>
      <EmbGoogleCal />
    </div>
  );
}
