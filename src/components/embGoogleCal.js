import React from 'react';
import "../styles/embGoogleCal.css"

const EmbGoogleCal = () => {
    return (
    <div className="googleCal">
        <iframe
            src = "https://calendar.google.com/calendar/embed?src=c_ffa94f99edc250040f3408edd5bcee3e3e3f3f4ac7b412a80f7b62adcfcb7ca0%40group.calendar.google.com&ctz=America%2FChicago"
            style = {{
                border: 'solid 3px #e34103',
                borderRadius: '7px',
                width: '70vw',
                height: '75vh'
            }}
            title = "BUILT google calendar"
        ></iframe>
    </div>   
    );
};
export default EmbGoogleCal;
