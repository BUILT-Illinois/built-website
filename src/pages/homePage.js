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
        "Speed-Friending.png",
        "coffee-social.png",
        "coffee-soical-2.png",
        "e-board.png",
        "KlayvioTalk.png",
        "OpenHouse-Food.png",
        "OpenHouse2.JPEG",
        "built-shirt.png",
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
