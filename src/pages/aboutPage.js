import React from 'react';
import StickyNavBar from '../components/stickyNavBar'
import '../styles/aboutPage.css';
import CardSlider from '../components/cardslider.js';
import ValueCard from '../components/valueCard.js';



function AboutPage() {
    return (
        <>
        <StickyNavBar></StickyNavBar>
        <div className="AboutPage">
            <header className="AboutPage-header">
                <div className="hero-section">
                    <div className="hero-overlay">
                        <h1 className='merriweather'>About Us</h1>
                    </div>
                    
                </div>
                <section className='mission' id='mission'>
                    <h2 className='brown merriweather' >Mission Statement</h2>
                    <div className='divider'></div>
                    <p>B[U]ILT is a non-profit student organization at the University of Illinois at Urbana-Champaign. We strive to become a strong support system for minorities in computing-related fields that fosters scholarship, professional development, and a sense of community. We seek to improve the diversity of the workplace in computing fields by holding technical and professional events for current students, in addition to running outreach programs to encourage the next generation of students from underrepresented communities to pursue careers in computing fields.</p>
                </section>
                <h2 className='brown value-header merriweather'>Our Values</h2>
                <section className='values'>
                    <ValueCard 
                        url="graduation-cap-512.png" 
                        value="Academic Support" 
                        text="We provide resources and mentorship to help our members excel academically. From study groups to tutoring sessions, our goal is to support students in achieving their educational goals and overcoming challenges in their coursework." 
                    />
                    <ValueCard 
                        url="tie-512.png" 
                        value="Professional Support" 
                        text="Preparing for a successful career starts here. Through networking events, resume workshops, and mock interviews, we equip our members with the skills and connections needed to thrive in the professional world." 
                    />
                    <ValueCard 
                        url="group-512.png" 
                        value="Community Support" 
                        text="A strong sense of community is at the heart of our organization. We foster a welcoming environment where members can connect, collaborate, and build lasting friendships, creating a support system that extends beyond the classroom." 
                    />
                </section>
                <h2 className='brown value-header merriweather'>Meet the E-Board!</h2>
             
            </header>
            <CardSlider
            data={data}
            />
        </div>
        </>

    );
}

export default AboutPage;

const data = [
    {
        image: "/eboard/melissa.png",
        title: "President",
        name: "Melissa Aninagyei-Bonsu",
        pronouns: "she/her",
        email: "mba4@illinois.edu",
        description: "Hey, I’m Melissa, President of B[U]ILT! I spend most of my time bouncing between classes, running track, playing flag football, and figuring out what to do with my hair next. Leading B[U]ILT is one of my favorite parts of college! I get to meet amazing people, plan fun events, and help create a community where we can all thrive."
    },
    {
        image: "/eboard/bolden.jpg",
        title: "Vice President",
        name: "Bolden Jones",
        pronouns: "he/him",
        email: "boldenj2@illinois.edu",
        description: "Hi, my name is Bolden! I am a senior studying Computer Science with a minor in Statistics, from Flossmoor, IL. As this year’s Vice President, I’m excited to help lead B[U]ILT in fostering community, supporting our members, and strengthening the overall impact of our organization. In my free time, I like going to the gym, playing volleyball, and playing electric guitar."
    },
    {
        image: "/eboard/adrian.png",
        title: "Treasurer",
        name: "Adrian Lara",
        pronouns: "he/him",
        email: "adrian11@illinois.edu",
        description: "I'm a Pokemon enthusiast and horror film fanatic. Feel free to reach out for horror film recommendations or ask about what I'm currently watching!"
    },
    {
        image: "/eboard/eduardo.jpg",
        title: "Secretary",
        name: "Eduardo Morales",
        pronouns: "he/him",
        email: "emora38@illinois.edu",
        description: "Hi! My name is Eduardo Morales, but I like to go by Eddy, and I am the secretary for the Fall 2025 semester! I am a senior studying Mathematics and Computer Science, and a little about me is that I love origami, Pókemon, and am an avid Letterboxd reviewer. If you ever see me around the B[U]ILT office, don't hesitate to reach out!"
    },
    {
        image: "/eboard/carolina.png",
        title: "Internal Director",
        name: "Carolina Rosas",
        pronouns: "she/her",
        email: "cr46@illinois.edu",
        description: "Hi all! I am a Senior studying Computer Science, getting ready to graduate in the spring. I am beyond excited to get to meet at the new members who want to be part of this amazing community. Please feel free to reach out about anything! Fun fact about me, I love public speaking and comedy! I am on the Hive Society Comedy Club here on campus!"

    },
    {
        image: "/eboard/jasmin.png",
        title: "Social Director",
        name: "Jasmin Salgado",
        pronouns: "she/her",
        email: "jsalg20@illinois.edu",
        description: "Hello my name is Jasmin! I am a senior studying computer science and minoring in informatics. I am from Romeoville, IL. I love watching Netflix, taking pictures, and spending time with my family and friends! I am this year’s Social Director and I am excited to bring together our community through some fun and exciting social events!!"
    },
    {
        image: "/eboard/alondra.jpg",
        title: "External Director",
        name: "Alondra Gonzalez",
        pronouns: "he/him",
        email: "ag131@illinois.edu",
        description: "Alondra is a Senior in Computer Science who transferred to UIUC in Fall 2024. She is committed to making tech more accessible and inclusive, and through her role as External Director of B[U]ILT, she works to empower minority students to thrive in the industry. She has previous internship experiences at Atlassian and Microsoft and will be working full time at Atlassian after graduation." 
    },
    {
        image: "/eboard/steven.jpeg",
        title: "Infrastructure Director",
        name: "Steven Uruchima",
        pronouns: "he/him",
        email: "scu2@illinois.edu",
        description: "Hey everyone! I'm a Junior studying Computer Science and this years Infrastructure Director! I enjoy working on tech projects and am always open to meeting other B[U]ILT members!"
    },
    {
        image: "/eboard/bijou.jpg",
        title: "Outreach Director",
        name: "Bijou Leinbach",
        pronouns: "she/her",
        email: " bijoucl2@illinois.edu",
        description: "Hi! I’m Bijou, and I’m your outreach director this year! I’m a Junior this year and super excited to meet all of you:)"
    },
    {
        image: "/eboard/dakarai.jpg",
        title: "Graduate Affairs Director",
        name: "Dakarai Crowder",
        pronouns: "he/him",
        email: "dcrowd3@illinois.edu",
        description: "Hey I'm dakarai and I am a PhD student in computer science studying tactile sensing and human robot interaction. Some of my hobbies are baking, climbing, and thrifting." 
    },
    {
        image: "/eboard/paloma.jpg",
        title: "Marketing Director",
        name: "Paloma Pichardo",
        pronouns: "she/her",
        email: "palomap3@illinois.edu",
        description: "Hi! My name is Paloma Pichardo, and I am a sophomore studying Computer Science with a minor in Business. I am from Houston, Texas and really enjoy running, eating sushi, and the movie Fantastic Mr. Fox. I am so excited to serve as Marketing Director this school year and can’t wait to meet you all!"
    },
]