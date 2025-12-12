import React from "react";

const Researches = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Researches</h1>
      <p style={styles.text}>
        Explore cutting-edge studies and publications.
        <br />
        (Research archive coming soon...)
      </p>
    </div>
  );
};

const styles = {
  container: {
    padding: "2rem",
    textAlign: "center",
    color: "#333",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "1rem",
  },
  text: {
    fontSize: "1.2rem",
    color: "#666",
  },
};

export default Researches;
