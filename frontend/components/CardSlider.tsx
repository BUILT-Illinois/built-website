"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "../styles/cardSlider.css";
import type { EboardMember } from "../types/content";

interface CardSliderProps {
  data: EboardMember[];
}

function CardSlider({ data }: CardSliderProps) {
  return (
    <div className="wrapper">
      <Swiper
        loop={true}
        modules={[Autoplay, Navigation, Pagination]}
        navigation
        // Bios range from empty to ~600 characters; a fixed card height clipped
        // the long ones. Let each slide size to its content instead.
        autoHeight={true}
        pagination={{ clickable: true }}
        autoplay={{
          delay: 500000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        spaceBetween={50}
        slidesPerView={1}
        className="swiper"
      >
        {data.map((item) => (
          <SwiperSlide className="slides" key={item.email}>
            <div className="cards">
              <h1 className="eboard-title">
                <span className="brown">{item.title}</span>
              </h1>
              <h2 className="eboard-subtitle">
                <span className="brown">{item.name}</span>
              </h2>
              <p className="cardText">{item.email}</p>
              <p className="cardText">{item.description}</p>
            </div>
            <div className="imgcontainer">
              {item.image && <img className="image" src={item.image} alt="e-board" />}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default CardSlider;
