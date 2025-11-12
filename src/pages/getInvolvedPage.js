import React from "react";
import StickyNavBar from "../components/stickyNavBar";
import "../styles/getInvolvedPage.css";
import CommitteeCard from "../components/committeeCard";

function GetInvolvedPage() {
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
        <a
          href="https://forms.gle/WQuwvfkdqJGcMkbW9"
          target="_blank"
          rel="noopener noreferrer"
        >
          JOIN OUR EMAIL LIST!
        </a>
      </p>

      <p className="join-committees">
        Interested in helping B[U]ILT organize such events? Join our committees!
      </p>

      <h2 className="committee-header">Committees</h2>

      <div className="light-orange-card">
        <CommitteeCard
          name="Tech"
          lead="Steven Uruchima"
          netid="scu2"
          description="Build technical projects supporting B[U]ILT’s mission!"
          meeting="Meets 6:00-7:00 PM every Monday at Siebel CS 0218"
          channel="tech-committee"
        ></CommitteeCard>
        <CommitteeCard
          name="External"
          lead="Alondra Gonzalez"
          netid="achav8"
          description="Build and maintain partnership opportunities between B[U]ILT and sponsors!"
          meeting="Meets every other Thursday 4:30 at Siebel CS 0212"
          channel="external-committee"
        ></CommitteeCard>
        <CommitteeCard
          name="Social"
          lead="Jasmin Salgado"
          netid="jsalg20"
          description="Plan and organize social events to build B[U]ILT’s community!"
          meeting="Meets every other Tuesday 5:00-6:00 PM at Siebel CS 0212"
          channel="social-committee"
        ></CommitteeCard>
        <CommitteeCard
          name="Outreach"
          lead="Bijou Leinbach"
          netid="bijoucl2"
          description="Engage with high schools to inspire future B[U]ILT members to study at UIUC!"
          meeting="Check the calendar for meeting times!"
          channel="outreach-committee"
        ></CommitteeCard>
      </div>
    </div>
  );
}

export default GetInvolvedPage;
