import "../styles/valueCard.css";

interface ValueCardProps {
  url: string;
  value: string;
  text: string;
}

function ValueCard({ url, value, text }: ValueCardProps) {
  return (
    <div className="valueCard">
      <section className="valueImage">
        <img className="valueCardImage" src={url} alt="" />
      </section>
      <section className="valueText">
        <h3 className="merriweather">{value}</h3>
        <p>{text}</p>
      </section>
    </div>
  );
}

export default ValueCard;
