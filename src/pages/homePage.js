import React from 'react';
import StickyNavBar from '../components/stickyNavBar';
import '../styles/homePage.css';
import PhotoCarousel from '../components/photoCarousel';
//import MemberCard from '../components/memberCard';
import WelcomeCard from '../components/welcomeCard';
import SponsorsSlider from '../components/sponsorsSlider';
import sponsors from '../utils/sponsorsData';

function HomePage() {
    const carouselImages = [
        "/event-photos/meet-exec.jpg",
        "/event-photos/elections-2026.jpg",
        "/event-photos/cboe.jpg",
        "/event-photos/built-barbies-merch.jpg",
        "/event-photos/speedfriending.jpg",
        "/event-photos/atlassian.jpg",
        "/event-photos/visa.jpg",
        "/event-photos/whm-panel.jpg",
        "/event-photos/pwc.jpg",
        "/event-photos/letters-of-love.jpg",
        "/event-photos/brewlab-3.jpg",
        "/event-photos/corn-maze.jpg",
        "/event-photos/builtsgiving.jpg",
        "/event-photos/cboe.jpg",
        "/event-photos/portillos.jpg",
        "/event-photos/hackathon-3.jpg",
        "/event-photos/housewarming.jpg",
        "/event-photos/atlassian-2.jpg",
        "/event-photos/hackathon-2.jpg",
        "/event-photos/nmsh-2.jpg",
        "/event-photos/fundraising.jpg",
        "/event-photos/visa-2.jpg",
        "/event-photos/quad-day.jpg",
        "/event-photos/hackathon.jpg",
        "/event-photos/built-day.jpg",
        "/event-photos/brewlab-2.jpg",
        "/event-photos/brewlab.jpg",
        "/event-photos/eoh.jpg",
        "/event-photos/duolingo.jpg",
        "/event-photos/gbm-icebreaker.jpg",
        "/event-photos/intramurals.jpg",
        ];

    return (    
        <div className="Home-Page">
            <StickyNavBar />
            <div className='logo-row'>
                <img
                    src="built-logo-no-background.png"
                    className='home-logo'
                    alt=''
                />
            </div>
            <div className='welcome-elements'>
                <WelcomeCard className="welcome-card"/>
                <PhotoCarousel imageSrcs={carouselImages} className="photo-carousel"/>
            </div>
            
            <h1 className='home-text'>Our Sponsors</h1>
            <SponsorsSlider sponsors={sponsors} />
            
            {/* <h1 className='home-text'> Members Of The Month!</h1>
            <div className='month-members'>
                <MemberCard
                    name="First Last"
                    imageSrc="coffee-social.png"
                    description="Lorem ipsum odor amet, consectetuer adipiscing elit. Dapibus elementum in consectetur auctor lacus. Curae sagittis dictum bibendum posuere interdum integer parturient mattis quam. Rutrum montes mi mollis elit lacus amet arcu. Fames torquent diam neque porta praesent est luctus."
                />
                <MemberCard
                    name="First Last"
                    imageSrc="coffee-social.png"
                    description="Lorem ipsum odor amet, consectetuer adipiscing elit. Dapibus elementum in consectetur auctor lacus. Curae sagittis dictum bibendum posuere interdum integer parturient mattis quam. Rutrum montes mi mollis elit lacus amet arcu. Fames torquent diam neque porta praesent est luctus."
                />
            </div> */}
        </div>
    );
}

export default HomePage;
