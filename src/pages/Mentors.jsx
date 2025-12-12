import React from "react";

const Mentors = () => {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Mentors</h1>
      <p style={styles.text}>
        Connect with experienced professionals.
        <br />
        (Mentors list coming soon...)
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

export default Mentors;
