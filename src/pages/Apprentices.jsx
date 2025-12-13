import React from "react";

const Apprentices = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Apprentices</h1>
      <p style={styles.text}>
        Discover rising talent and new opportunities.
        <br />
        (Apprentices list coming soon...)
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

export default Apprentices;
