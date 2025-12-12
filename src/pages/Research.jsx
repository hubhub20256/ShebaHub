import { useParams } from "react-router-dom";

const Research = () => {
  const { id } = useParams();

  return (
    <div className="page-container">
      <h1>Research Project</h1>
      <p>
        Details for Project ID: <strong>{id}</strong>
      </p>
    </div>
  );
};

export default Research;
