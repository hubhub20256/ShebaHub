import { useParams } from "react-router-dom";

const Profile = () => {
  const { id } = useParams();

  return (
    <div className="page-container">
      <h1>User Profile</h1>
      <p>
        Viewing profile for User ID HI hello test: <strong>{id}</strong>
      </p>
    </div>
  );
};

export default Profile;
