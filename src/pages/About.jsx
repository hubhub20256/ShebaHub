import React from "react";
import "../styles/About.css";

const About = () => {
  return (
    <main className="about-page">
      <div className="about-content">
        <h1 className="about-title">About ShebaHub</h1>

        <section className="about-section">
          <h2 className="about-subtitle">Our Mission</h2>
          <p className="about-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
        </section>

        <section className="about-section">
          <h2 className="about-subtitle">Who We Are</h2>
          <p className="about-text">
            Duis aute irure dolor in reprehenderit in voluptate velit esse
            cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
            cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum.
          </p>
        </section>
      </div>
    </main>
  );
};

export default About;

