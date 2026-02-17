import React from 'react'
import '../styles/footer.css'

function Footer() {
    return (
        <footer className='footer'>
            <div className='footer-icons'>
                <a href='https://tinyurl.com/built-uiuc' target='_blank' rel='noopener noreferrer'>
                    <img src = 'slack-svgrepo-com.svg' alt='slack svg' />
                </a>
                <a href='https://github.com/orgs/B-U-I-L-T-UIUC/repositories' target='_blank' rel='noopener noreferrer'>
                    <img src = 'github-svgrepo-com.svg' alt='github svg' />
                </a>
                <a href='https://www.instagram.com/built_by_colorstack/' target='_blank' rel='noopener noreferrer'>
                    <img src = 'instagram-svgrepo-com.svg' alt='instagram svg' />
                </a>
                <a href='https://www.linkedin.com/in/built-uiuc/' target='_blank' rel='noopener noreferrer'>
                    <img src = 'linkedin-svgrepo-com.svg' alt='linkedin svg' />
                </a>
            </div>
        </footer>
   
    )
}

export default Footer
