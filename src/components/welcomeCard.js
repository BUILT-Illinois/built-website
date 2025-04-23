import React from 'react'
import '../styles/welcomeCard.css'

function WelcomeCard({name, imageSrc, description}) {
    return (
        <div className='welcome-card'>

            <h1 className='welcome-text'>B[U]ILT @ UIUC</h1> 
            <p className='welcome-desc'>
                Empowering underrepresented voices in computing at UIUC -- 
                join us in building a diverse future!
            </p>  
            <div className='icons'>
                <a href='https://tinyurl.com/built-uiuc' target='_blank' rel='noopener noreferrer'>
                    <img src = 'slack-svgrepo-com.svg' alt='twitter svg' />
                </a>
                <a href='https://github.com/BUILT-Illinois' target='_blank' rel='noopener noreferrer'>
                    <img src = 'github-svgrepo-com.svg' alt='github svg' />
                </a>
                <a href='https://www.instagram.com/built_uiuc/' target='_blank' rel='noopener noreferrer'>
                    <img src = 'instagram-svgrepo-com.svg' alt='instagram svg' />
                </a>
                <a href='https://www.linkedin.com/in/built-uiuc/' target='_blank' rel='noopener noreferrer'>
                    <img src = 'linkedin-svgrepo-com.svg' alt='linkedin svg' />
                </a>
            </div>     
            {/* <h1 className='welcome-text'>Upcoming Events</h1> */}
            {/* Insert event cards here */}
        </div>
    )
}

export default WelcomeCard