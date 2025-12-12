import React from "react";

const About = () => {
  return (
    <main style={styles.container}>
      <div style={styles.contentWrapper}>
        <h1 style={styles.title}>About ShebaHub</h1>

        <section style={styles.section}>
          <h2 style={styles.subtitle}>Our Mission</h2>
          <p style={styles.text}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat.
          </p>
        </section>

        <section style={styles.section}>
          <h2 style={styles.subtitle}>Who We Are</h2>
          <p style={styles.text}>
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

const styles = {
  container: {
    padding: "2rem",
    display: "flex",
    justifyContent: "center",
    minHeight: "80vh", // Ensures the footer gets pushed down
  },
  contentWrapper: {
    maxWidth: "800px", // Professional readable width
    width: "100%",
    textAlign: "right", // Right-to-left alignment for Hebrew context (assumed from previous prompt)
  },
  title: {
    fontSize: "2.5rem",
    marginBottom: "1.5rem",
    color: "#333",
    borderBottom: "2px solid #f0f0f0",
    paddingBottom: "1rem",
  },
  section: {
    marginBottom: "2rem",
  },
  subtitle: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
    color: "#555",
  },
  text: {
    lineHeight: "1.6", // Improves readability significantly
    fontSize: "1rem",
    color: "#666",
  },
};

export default About;
