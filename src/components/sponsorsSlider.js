import React from 'react';
import '../styles/sponsorsSlider.css';

const SponsorsSlider = ({ sponsors = [] }) => {
    if (sponsors.length === 0) {
        return <div className="sponsors-slider">No sponsors to display</div>;
    }

    // Duplicate the list so the marquee loops seamlessly
    const items = [...sponsors, ...sponsors];

    return (
        <div className="sponsors-slider-wrapper">
            <div className="sponsors-slider">
                <div className="marquee-track">
                    {items.map((sponsor, index) => (
                        <div key={index} className="marquee-item">
                            <img src={sponsor.logo} alt={sponsor.name} className={sponsor.className || ''} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SponsorsSlider;