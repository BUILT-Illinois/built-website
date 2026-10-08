"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSwipeable } from "react-swipeable";
import "../styles/photoCarousal.css";

interface PhotoCarouselProps {
  imageSrcs: string[];
}

const PhotoCarousel = ({ imageSrcs }: PhotoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % imageSrcs.length);
        setFade(true);
      }, 1000);
    }, 5000);
  }, [imageSrcs.length]);

  useEffect(() => {
    resetInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [imageSrcs.length, resetInterval]);

  const handleDotClick = (index: number) => {
    setFade(false);
    setTimeout(() => {
      setCurrentIndex(index);
      setFade(true);
      resetInterval();
    }, 500);
  };

  const handleBackClick = () => {
    setFade(false);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + imageSrcs.length) % imageSrcs.length);
      setFade(true);
      resetInterval();
    }, 500);
  };

  const handleNextClick = () => {
    setFade(false);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % imageSrcs.length);
      setFade(true);
      resetInterval();
    }, 500);
  };

  // Swipe handlers for mobile interaction
  const handlers = useSwipeable({
    onSwipedLeft: handleNextClick,
    onSwipedRight: handleBackClick,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  return (
    <div>
      <div className="carousel-container" {...handlers}>
        <img
          src={imageSrcs[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          className={`carousel-image ${fade ? "fade-in" : "fade-out"}`}
        />
      </div>
      <div className="carousel-controls">
        <span className="carousel-arrow" onClick={handleBackClick}>
          &lt;
        </span>
        <div className="carousel-dots">
          {imageSrcs.map((_, index) => (
            <span
              key={index}
              className={`dot ${currentIndex === index ? "active" : ""}`}
              onClick={() => handleDotClick(index)}
            ></span>
          ))}
        </div>
        <span className="carousel-arrow" onClick={handleNextClick}>
          &gt;
        </span>
      </div>
    </div>
  );
};

export default PhotoCarousel;
