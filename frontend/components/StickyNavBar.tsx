"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import throttle from "lodash/throttle";
import "../styles/stickyNavBar.css";

const StickyNavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = throttle(() => {
      setIsScrolled(window.scrollY > 10);
    }, 50); // Throttle to once every 50ms

    const handleClickOutside = (event: MouseEvent) => {
      if (
        navRef.current &&
        !navRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      <div style={{ height: isScrolled ? "70px" : "0" }}></div>
      <div className={`navbar-wrapper ${isScrolled ? "fixed-top" : ""}`}>
        <div className="navbar">
          <button className="hamburger-menu" onClick={toggleMenu} ref={menuButtonRef}>
            <span className="line"></span>
            <span className="line"></span>
            <span className="line"></span>
          </button>

          <div className={`nav-links ${menuOpen ? "show" : ""}`} ref={navRef}>
            <Link href="/" className="button" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link href="/about" className="button" onClick={() => setMenuOpen(false)}>
              About Us
            </Link>
            <Link href="/calendar" className="button" onClick={() => setMenuOpen(false)}>
              Calendar
            </Link>
            <Link href="/get-involved" className="button" onClick={() => setMenuOpen(false)}>
              Get Involved
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default StickyNavBar;
