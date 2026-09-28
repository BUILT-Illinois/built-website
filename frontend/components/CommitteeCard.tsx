import "../styles/committeeCard.css";
import type { Committee } from "../types/content";

type CommitteeCardProps = Committee;

const CommitteeCard = ({
  name,
  lead,
  email,
  description,
  meeting,
  channel,
}: CommitteeCardProps) => {
  return (
    <div className="orange-card">
      <div className="horizontal-stack">
        <div className="vertical-stack">
          <h3 className="name">
            {" "}
            {name} <br />
            Committee
          </h3>
          <h4 className="lead">{lead}</h4>
          <h5 className="email">{email}</h5>
        </div>
        <div className="vertical-stack">
          <p className="description">{description}</p>
          <p className="channel">Check out #{channel} in our slack!</p>
          <h5 className="meeting">{meeting}</h5>
        </div>
      </div>
    </div>
  );
};
export default CommitteeCard;
