import StickyNavBar from "../../components/StickyNavBar";
import CommitteeCard from "../../components/CommitteeCard";
import { committees } from "../../data/committees";
import "../../styles/getInvolvedPage.css";

export default function GetInvolvedPage() {
  return (
    <div className="Get-Involved-Page">
      <StickyNavBar />
      <h1 className="get-involved-header">Get Involved</h1>
      <p className="get-involved-text">
        B[U]ILT is a growing RSO, always looking for new members at UIUC who are
        part of or believe in our mission!
      </p>
      <p className="get-involved-text">
        As part of our mission, we host social and corporate events, build
        technical projects, and provide study hour spaces in order to provide a
        strong support system for minorities in computing-related fields.
      </p>

      <p className="join-email-list">
        <a href="https://forms.gle/WQuwvfkdqJGcMkbW9" target="_blank" rel="noopener noreferrer">
          JOIN OUR EMAIL LIST!
        </a>
      </p>

      <p className="join-committees">
        Interested in helping B[U]ILT organize such events? Join our committees!
      </p>

      <h2 className="committee-header">Committees</h2>

      <div className="light-orange-card">
        {committees.map((committee) => (
          <CommitteeCard key={committee.channel} {...committee} />
        ))}
      </div>
    </div>
  );
}
